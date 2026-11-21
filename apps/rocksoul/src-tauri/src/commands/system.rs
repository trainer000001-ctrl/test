use std::{
    io::{Read, Write},
    net::TcpListener,
    thread,
    time::{Duration, Instant},
};
use tauri::AppHandle;

use crate::{
    commands::{issues::query_issues, repositories::query_repositories},
    db,
    models::{Dashboard, DashboardStats, Event, MidLoopbackCallback},
};

const MID_LOOPBACK_TIMEOUT_SECS: u64 = 180;
const MID_LOOPBACK_MAX_REQUEST_BYTES: usize = 16_384;

pub fn query_events(connection: &rusqlite::Connection) -> Result<Vec<Event>, String> {
    let mut statement = connection.prepare(
        "SELECT id, kind, message, created_at FROM events ORDER BY created_at DESC, rowid DESC LIMIT 100"
    ).map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok(Event {
                id: row.get(0)?,
                kind: row.get(1)?,
                message: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn list_events(app: AppHandle) -> Result<Vec<Event>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let connection = db::connect(&app)?;
        query_events(&connection)
    })
    .await
    .map_err(|error| format!("Event worker failed: {error}"))?
}

#[tauri::command]
pub async fn get_dashboard(app: AppHandle) -> Result<Dashboard, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let connection = db::connect(&app)?;
        let active: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM issues WHERE status NOT IN ('done', 'closed')",
                [],
                |row| row.get(0),
            )
            .map_err(|error| error.to_string())?;
        Ok(Dashboard {
            stats: DashboardStats {
                active,
                blocked: connection
                    .query_row(
                        "SELECT COUNT(*) FROM issues WHERE status = 'blocked'",
                        [],
                        |row| row.get(0),
                    )
                    .map_err(|error| error.to_string())?,
                completed: connection
                    .query_row(
                        "SELECT COUNT(*) FROM issues WHERE status IN ('done', 'closed')",
                        [],
                        |row| row.get(0),
                    )
                    .map_err(|error| error.to_string())?,
            },
            issues: query_issues(&connection)?,
            repositories: query_repositories(&connection)?,
            events: query_events(&connection)?,
        })
    })
    .await
    .map_err(|error| format!("Dashboard worker failed: {error}"))?
}

fn with_redirect_uri(authorize_url: &str, redirect_uri: &str) -> Result<String, String> {
    if authorize_url.chars().any(char::is_control) {
        return Err("Authorization URL is malformed.".into());
    }
    let trimmed = authorize_url.trim();
    if trimmed.is_empty() {
        return Err("Authorization URL is malformed.".into());
    }
    let mut parsed =
        url::Url::parse(trimmed).map_err(|error| format!("Invalid authorization URL: {error}"))?;
    if parsed.scheme() != "https" && parsed.scheme() != "http" {
        return Err("Authorization URL must use http or https.".into());
    }
    if parsed.host_str().is_none() || !parsed.username().is_empty() || parsed.password().is_some() {
        return Err("Authorization URL host is invalid.".into());
    }
    let preserved_pairs: Vec<(String, String)> = parsed
        .query_pairs()
        .filter(|(key, _)| key != "redirect_uri")
        .map(|(key, value)| (key.into_owned(), value.into_owned()))
        .collect();
    {
        let mut pairs = parsed.query_pairs_mut();
        pairs.clear();
        for (key, value) in preserved_pairs {
            pairs.append_pair(&key, &value);
        }
        pairs.append_pair("redirect_uri", redirect_uri);
    }
    Ok(parsed.into())
}

fn read_http_request(stream: &mut std::net::TcpStream) -> Result<String, String> {
    let _ = stream.set_read_timeout(Some(Duration::from_secs(5)));
    let mut buffer = Vec::with_capacity(2048);
    let mut chunk = [0_u8; 2048];
    loop {
        match stream.read(&mut chunk) {
            Ok(0) => break,
            Ok(count) => {
                let remaining = MID_LOOPBACK_MAX_REQUEST_BYTES.saturating_sub(buffer.len());
                let take = count.min(remaining);
                buffer.extend_from_slice(&chunk[..take]);
                if buffer.windows(4).any(|window| window == b"\r\n\r\n")
                    || buffer.windows(2).any(|window| window == b"\n\n")
                    || buffer.len() >= MID_LOOPBACK_MAX_REQUEST_BYTES
                {
                    break;
                }
            }
            Err(error)
                if matches!(
                    error.kind(),
                    std::io::ErrorKind::WouldBlock | std::io::ErrorKind::TimedOut
                ) =>
            {
                break;
            }
            Err(error) => return Err(error.to_string()),
        }
    }
    Ok(String::from_utf8_lossy(&buffer).into_owned())
}

fn write_http_response(
    stream: &mut std::net::TcpStream,
    status: &str,
    content_type: &str,
    body: &str,
) {
    let payload = format!(
        "HTTP/1.1 {status}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    let _ = stream.write_all(payload.as_bytes());
    let _ = stream.flush();
}

fn wait_for_mid_callback(
    listener: TcpListener,
    redirect_uri: String,
    timeout: Duration,
) -> Result<MidLoopbackCallback, String> {
    listener
        .set_nonblocking(true)
        .map_err(|error| error.to_string())?;
    let deadline = Instant::now() + timeout;
    loop {
        match listener.accept() {
            Ok((mut stream, _)) => {
                let request_text = read_http_request(&mut stream)?;
                let mut parts = request_text
                    .lines()
                    .next()
                    .unwrap_or_default()
                    .split_whitespace();
                let method = parts.next().unwrap_or_default();
                let target = parts.next().unwrap_or_default();
                if target.is_empty() {
                    write_http_response(
                        &mut stream,
                        "400 Bad Request",
                        "text/plain; charset=utf-8",
                        "Invalid callback request.",
                    );
                    continue;
                }
                let Ok(callback_url) = url::Url::parse(&format!("http://127.0.0.1{target}")) else {
                    write_http_response(
                        &mut stream,
                        "400 Bad Request",
                        "text/plain; charset=utf-8",
                        "Malformed callback URL.",
                    );
                    continue;
                };
                if callback_url.path() != "/callback" {
                    write_http_response(
                        &mut stream,
                        "404 Not Found",
                        "text/plain; charset=utf-8",
                        "Not found.",
                    );
                    continue;
                }
                if method != "GET" {
                    write_http_response(
                        &mut stream,
                        "405 Method Not Allowed",
                        "text/plain; charset=utf-8",
                        "Method not allowed.",
                    );
                    continue;
                }

                let mut code: Option<String> = None;
                let mut state: Option<String> = None;
                let mut oauth_error: Option<String> = None;
                let mut error_description: Option<String> = None;
                for (key, value) in callback_url.query_pairs() {
                    match key.as_ref() {
                        "code" if !value.is_empty() => code = Some(value.into_owned()),
                        "state" if !value.is_empty() => state = Some(value.into_owned()),
                        "error" if !value.is_empty() => oauth_error = Some(value.into_owned()),
                        "error_description" if !value.is_empty() => {
                            error_description = Some(value.into_owned())
                        }
                        _ => {}
                    }
                }

                if let Some(err_code) = oauth_error {
                    let detail = error_description.unwrap_or(err_code);
                    write_http_response(
                        &mut stream,
                        "400 Bad Request",
                        "text/html; charset=utf-8",
                        "<!doctype html><html><body style=\"background:#101010;color:#f3ebd9;font-family:monospace;padding:32px\"><h2>ROCKSOUL - DX</h2><p>MoonWitness ID sign-in was cancelled or denied. You may close this tab.</p></body></html>",
                    );
                    return Err(format!("MoonWitness ID sign-in failed: {detail}"));
                }

                match (code, state) {
                    (Some(code), Some(state)) => {
                        write_http_response(
                            &mut stream,
                            "200 OK",
                            "text/html; charset=utf-8",
                            "<!doctype html><html><body style=\"background:#101010;color:#d7ff36;font-family:monospace;padding:32px\"><h2>ROCKSOUL - DX</h2><p style=\"color:#f3ebd9\">MoonWitness ID sign-in received. You may close this tab and return to the app.</p></body></html>",
                        );
                        return Ok(MidLoopbackCallback {
                            code,
                            state,
                            redirect_uri,
                        });
                    }
                    _ => {
                        write_http_response(
                            &mut stream,
                            "400 Bad Request",
                            "text/html; charset=utf-8",
                            "<!doctype html><html><body style=\"background:#101010;color:#f3ebd9;font-family:monospace;padding:32px\"><h2>ROCKSOUL - DX</h2><p>Missing authorization code or state.</p></body></html>",
                        );
                        return Err(
                            "MoonWitness ID callback did not include authorization code and state."
                                .into(),
                        );
                    }
                }
            }
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                if Instant::now() >= deadline {
                    return Err("MoonWitness ID sign-in timed out waiting for callback.".into());
                }
                thread::sleep(Duration::from_millis(100));
            }
            Err(error) => return Err(error.to_string()),
        }
    }
}

#[tauri::command]
pub async fn await_mid_loopback_callback(
    authorize_url: String,
) -> Result<MidLoopbackCallback, String> {
    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|error| format!("Could not open local sign-in callback: {error}"))?;
    let local_addr = listener.local_addr().map_err(|error| error.to_string())?;
    let redirect_uri = format!("http://{local_addr}/callback");
    let launch_url = with_redirect_uri(&authorize_url, &redirect_uri)?;
    open::that(&launch_url)
        .map_err(|error| format!("Could not open browser for sign-in: {error}"))?;
    tauri::async_runtime::spawn_blocking(move || {
        wait_for_mid_callback(
            listener,
            redirect_uri,
            Duration::from_secs(MID_LOOPBACK_TIMEOUT_SECS),
        )
    })
    .await
    .map_err(|error| format!("MoonWitness ID callback worker failed: {error}"))?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::TcpStream;

    #[test]
    fn rewrites_redirect_uri_and_rejects_unsafe_authorize_urls() {
        let updated = with_redirect_uri(
            "https://id.moonwitness.biz.id/authorize?client_id=rocksoul-dx&redirect_uri=http%3A%2F%2F127.0.0.1%2Fcallback&state=st_1&code_challenge=abc",
            "http://127.0.0.1:54321/callback",
        )
        .unwrap();
        let parsed = url::Url::parse(&updated).unwrap();
        let pairs: Vec<(String, String)> = parsed
            .query_pairs()
            .map(|(k, v)| (k.into_owned(), v.into_owned()))
            .collect();
        assert_eq!(
            pairs
                .iter()
                .filter(|(k, _)| k == "redirect_uri")
                .map(|(_, v)| v.as_str())
                .collect::<Vec<_>>(),
            vec!["http://127.0.0.1:54321/callback"]
        );
        assert!(pairs.contains(&("client_id".into(), "rocksoul-dx".into())));
        assert!(pairs.contains(&("state".into(), "st_1".into())));

        assert!(
            with_redirect_uri("file:///C:/Windows/cmd.exe", "http://127.0.0.1:1/callback").is_err()
        );
        assert!(with_redirect_uri(
            "https://user:pass@id.moonwitness.biz.id/authorize",
            "http://127.0.0.1:1/callback"
        )
        .is_err());
        assert!(with_redirect_uri(
            "https://id.moonwitness.biz.id/authorize\n",
            "http://127.0.0.1:1/callback"
        )
        .is_err());
        assert!(with_redirect_uri(
            "https://id.moonwitness.biz.id/authorize\ncmd",
            "http://127.0.0.1:1/callback"
        )
        .is_err());
    }

    #[test]
    fn receives_loopback_callback_and_ignores_favicon_probe() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        let redirect_uri = format!("http://{addr}/callback");

        let client = thread::spawn(move || {
            let mut favicon_stream = TcpStream::connect(addr).unwrap();
            favicon_stream
                .write_all(b"GET /favicon.ico HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n")
                .unwrap();
            let mut fav_buf = String::new();
            let _ = favicon_stream.read_to_string(&mut fav_buf);
            assert!(fav_buf.contains("404 Not Found"));

            let mut cb_stream = TcpStream::connect(addr).unwrap();
            cb_stream
                .write_all(
                    b"GET /callback?code=mwc_123&state=st_abc HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n",
                )
                .unwrap();
            let mut cb_buf = String::new();
            let _ = cb_stream.read_to_string(&mut cb_buf);
            assert!(cb_buf.contains("200 OK"));
        });

        let result =
            wait_for_mid_callback(listener, redirect_uri.clone(), Duration::from_secs(5)).unwrap();
        client.join().unwrap();
        assert_eq!(
            result,
            MidLoopbackCallback {
                code: "mwc_123".into(),
                state: "st_abc".into(),
                redirect_uri,
            }
        );
    }

    #[test]
    fn surfaces_oauth_error_and_timeout() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        let redirect_uri = format!("http://{addr}/callback");

        let client = thread::spawn(move || {
            let mut stream = TcpStream::connect(addr).unwrap();
            stream
                .write_all(
                    b"GET /callback?error=access_denied&error_description=User+cancelled&state=st_1 HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n",
                )
                .unwrap();
            let mut buf = String::new();
            let _ = stream.read_to_string(&mut buf);
        });

        let err =
            wait_for_mid_callback(listener, redirect_uri, Duration::from_secs(5)).unwrap_err();
        client.join().unwrap();
        assert!(err.contains("User cancelled"));

        let timeout_listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let timeout_addr = timeout_listener.local_addr().unwrap();
        let timeout_err = wait_for_mid_callback(
            timeout_listener,
            format!("http://{timeout_addr}/callback"),
            Duration::from_millis(50),
        )
        .unwrap_err();
        assert!(timeout_err.contains("timed out"));
    }
}
