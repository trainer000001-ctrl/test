use base64::{engine::general_purpose::STANDARD, Engine};
use chacha20poly1305::{
    aead::{Aead, KeyInit},
    XChaCha20Poly1305, XNonce,
};
use rand::RngCore;
use reqwest::blocking::Client;
use rusqlite::{params, Connection, OptionalExtension};
use serde::Deserialize;
use sha2::Digest;
use std::{
    fs,
    path::{Path, PathBuf},
    thread,
    time::Duration,
};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

use crate::{db, models::CloudBackupStatus};

const DRIVE_UPLOAD_API: &str = "https://www.googleapis.com/upload/drive/v3";
const DRIVE_API: &str = "https://www.googleapis.com/drive/v3";
const DRIVE_SCOPE: &str = "https://www.googleapis.com/auth/drive.appdata";
pub const S3_BUCKET: &str = "rocksoul";

#[derive(Debug, Deserialize)]
struct GoogleTokenResponse {
    access_token: String,
    refresh_token: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GoogleUserInfo {
    email: String,
}

#[derive(Debug, Deserialize)]
struct GoogleDriveFile {
    id: String,
    name: String,
    #[serde(default, rename = "mimeType")]
    mime_type: String,
    #[serde(default)]
    size: String,
    #[serde(default, rename = "modifiedTime")]
    modified_time: String,
}

#[derive(Debug, Deserialize)]
struct LoopbackCallback {
    state: String,
    code: Option<String>,
    error: Option<String>,
}

fn client_id() -> Option<String> {
    option_env!("ROCKSOUL_GOOGLE_CLIENT_ID").map(str::to_owned)
}

fn client_secret() -> Option<String> {
    option_env!("ROCKSOUL_GOOGLE_CLIENT_SECRET").map(str::to_owned)
}

fn backup_key(app: &AppHandle) -> Result<[u8; 32], String> {
    let path = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?
        .join("cloud-backup.key");
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    if path.exists() {
        let bytes = fs::read(&path).map_err(|error| error.to_string())?;
        return bytes
            .try_into()
            .map_err(|_| "Local backup encryption key is invalid.".to_string());
    }
    let mut key = [0_u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut key);
    write_private_file(&path, &key)?;
    Ok(key)
}

#[cfg(unix)]
fn write_private_file(path: &PathBuf, contents: &[u8]) -> Result<(), String> {
    use std::os::unix::fs::OpenOptionsExt;
    let mut file = fs::OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .mode(0o600)
        .open(path)
        .map_err(|error| error.to_string())?;
    std::io::Write::write_all(&mut file, contents).map_err(|error| error.to_string())
}

#[cfg(windows)]
fn write_private_file(path: &PathBuf, contents: &[u8]) -> Result<(), String> {
    let mut file = fs::OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(path)
        .map_err(|error| error.to_string())?;
    std::io::Write::write_all(&mut file, contents).map_err(|error| error.to_string())
}

fn encrypt_secret(key: &[u8; 32], secret: &str) -> Result<String, String> {
    let cipher = XChaCha20Poly1305::new(key.into());
    let mut nonce = [0_u8; 24];
    rand::rngs::OsRng.fill_bytes(&mut nonce);
    let ciphertext = cipher
        .encrypt(XNonce::from_slice(&nonce), secret.as_bytes())
        .map_err(|_| "Unable to encrypt Google authorization data.".to_string())?;
    let mut value = nonce.to_vec();
    value.extend(ciphertext);
    Ok(STANDARD.encode(value))
}

fn decrypt_secret(key: &[u8; 32], encrypted: &str) -> Result<String, String> {
    let value = STANDARD
        .decode(encrypted)
        .map_err(|_| "Saved Google authorization data is malformed.".to_string())?;
    if value.len() < 24 {
        return Err("Saved Google authorization data is incomplete.".into());
    }
    let cipher = XChaCha20Poly1305::new(key.into());
    let plaintext = cipher
        .decrypt(XNonce::from_slice(&value[..24]), &value[24..])
        .map_err(|_| "Unable to decrypt Google authorization data.".to_string())?;
    String::from_utf8(plaintext).map_err(|error| error.to_string())
}

fn status_from_connection(
    connection: &Connection,
    available: bool,
) -> Result<CloudBackupStatus, String> {
    let settings = connection
        .query_row(
            "SELECT google_account, refresh_token_encrypted, last_backup_at
         FROM cloud_backup_settings WHERE id = 1",
            [],
            |row| {
                Ok((
                    row.get::<_, Option<String>>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, Option<String>>(2)?,
                ))
            },
        )
        .optional()
        .map_err(|error| error.to_string())?;
    let (account, token, last_backup_at) = settings.unwrap_or((None, None, None));
    Ok(CloudBackupStatus {
        available,
        connected: token.is_some(),
        account,
        last_backup_at,
        error: None,
    })
}

#[tauri::command]
pub fn cloud_backup_status(app: AppHandle) -> Result<CloudBackupStatus, String> {
    let connection = db::connect(&app)?;
    status_from_connection(&connection, client_id().is_some())
}

fn wait_for_oauth_callback(
    listener: std::net::TcpListener,
    expected_state: &str,
) -> Result<String, String> {
    listener
        .set_nonblocking(true)
        .map_err(|error| error.to_string())?;
    let deadline = std::time::Instant::now() + Duration::from_secs(180);
    loop {
        match listener.accept() {
            Ok((mut stream, _)) => {
                use std::io::{Read, Write};
                let mut request = [0_u8; 8192];
                let size = stream
                    .read(&mut request)
                    .map_err(|error| error.to_string())?;
                let request_text = String::from_utf8_lossy(&request[..size]).into_owned();
                let callback_url = request_text
                    .lines()
                    .next()
                    .ok_or_else(|| "Google authorization callback was empty.".to_string())?
                    .split_whitespace()
                    .nth(1)
                    .ok_or_else(|| "Google authorization callback was malformed.".to_string())?;
                let url = url::Url::parse(&format!("http://127.0.0.1{callback_url}"))
                    .map_err(|error| error.to_string())?;
                let callback: LoopbackCallback =
                    serde_urlencoded::from_str(url.query().unwrap_or(""))
                        .map_err(|error| error.to_string())?;
                let response = b"HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\nGoogle authorization received. You may close this window.";
                stream
                    .write_all(response)
                    .map_err(|error| error.to_string())?;
                if callback.state != expected_state {
                    return Err("Google authorization state validation failed.".into());
                }
                if let Some(error) = callback.error {
                    return Err(format!("Google authorization failed: {error}"));
                }
                return callback
                    .code
                    .ok_or_else(|| "Google did not return an authorization code.".into());
            }
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                if std::time::Instant::now() >= deadline {
                    return Err("Google authorization timed out.".into());
                }
                thread::sleep(Duration::from_millis(150));
            }
            Err(error) => return Err(error.to_string()),
        }
    }
}

fn exchange_code(
    client: &Client,
    code: &str,
    verifier: &str,
    redirect_uri: &str,
) -> Result<GoogleTokenResponse, String> {
    let id = client_id()
        .ok_or_else(|| "Google Drive backup is not configured in this build.".to_string())?;
    let secret = client_secret()
        .ok_or_else(|| "Google OAuth client secret is not configured.".to_string())?;
    let response: GoogleTokenResponse = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("code", code),
            ("client_id", id.as_str()),
            ("client_secret", secret.as_str()),
            ("redirect_uri", redirect_uri),
            ("grant_type", "authorization_code"),
            ("code_verifier", verifier),
        ])
        .send()
        .and_then(reqwest::blocking::Response::error_for_status)
        .and_then(reqwest::blocking::Response::json)
        .map_err(|error| format!("Google token exchange failed: {error}"))?;
    Ok(response)
}

#[tauri::command]
pub fn connect_google_drive(app: AppHandle) -> Result<CloudBackupStatus, String> {
    let id = client_id()
        .ok_or_else(|| "Google Drive backup is not configured in this build.".to_string())?;
    let listener = std::net::TcpListener::bind("127.0.0.1:0")
        .map_err(|error| format!("Could not open the local Google sign-in callback: {error}"))?;
    let redirect_uri = format!(
        "http://{}/callback",
        listener.local_addr().map_err(|error| error.to_string())?
    );
    let mut state_bytes = [0_u8; 32];
    let mut verifier_bytes = [0_u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut state_bytes);
    rand::rngs::OsRng.fill_bytes(&mut verifier_bytes);
    let state = STANDARD.encode(state_bytes);
    let verifier = STANDARD.encode(verifier_bytes);
    let challenge = STANDARD
        .encode(sha2::Sha256::digest(verifier.as_bytes()))
        .replace('+', "-")
        .replace('/', "_")
        .trim_end_matches('=')
        .to_string();
    let mut auth_url = url::Url::parse("https://accounts.google.com/o/oauth2/v2/auth")
        .map_err(|error| error.to_string())?;
    auth_url
        .query_pairs_mut()
        .append_pair("client_id", &id)
        .append_pair("redirect_uri", &redirect_uri)
        .append_pair("response_type", "code")
        .append_pair("scope", DRIVE_SCOPE)
        .append_pair("access_type", "offline")
        .append_pair("prompt", "consent")
        .append_pair("state", &state)
        .append_pair("code_challenge", &challenge)
        .append_pair("code_challenge_method", "S256");
    open::that(auth_url.as_str())
        .map_err(|error| format!("Could not open Google sign-in: {error}"))?;
    let code = wait_for_oauth_callback(listener, &state)?;
    let client = Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|error| error.to_string())?;
    let token = exchange_code(&client, &code, &verifier, &redirect_uri)?;
    let refresh_token = token
        .refresh_token
        .ok_or_else(|| "Google did not issue an offline refresh token.".to_string())?;
    let profile: GoogleUserInfo = client
        .get("https://www.googleapis.com/oauth2/v2/userinfo")
        .bearer_auth(&token.access_token)
        .send()
        .and_then(reqwest::blocking::Response::error_for_status)
        .and_then(reqwest::blocking::Response::json)
        .map_err(|error| format!("Could not read the Google account identity: {error}"))?;
    let encrypted = encrypt_secret(&backup_key(&app)?, &refresh_token)?;
    let connection = db::connect(&app)?;
    connection
        .execute(
            "INSERT INTO cloud_backup_settings (id, google_account, refresh_token_encrypted)
         VALUES (1, ?1, ?2)
         ON CONFLICT(id) DO UPDATE SET google_account = excluded.google_account,
           refresh_token_encrypted = excluded.refresh_token_encrypted",
            params![profile.email, encrypted],
        )
        .map_err(|error| error.to_string())?;
    status_from_connection(&connection, true)
}

#[tauri::command]
pub fn disconnect_google_drive(app: AppHandle) -> Result<CloudBackupStatus, String> {
    let connection = db::connect(&app)?;
    connection
        .execute("DELETE FROM cloud_backup_settings WHERE id = 1", [])
        .map_err(|error| error.to_string())?;
    status_from_connection(&connection, client_id().is_some())
}

fn access_token(client: &Client, refresh_token: &str) -> Result<String, String> {
    let id = client_id()
        .ok_or_else(|| "Google Drive backup is not configured in this build.".to_string())?;
    let secret = client_secret()
        .ok_or_else(|| "Google OAuth client secret is not configured.".to_string())?;
    let response: GoogleTokenResponse = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("client_id", id.as_str()),
            ("client_secret", secret.as_str()),
            ("refresh_token", refresh_token),
            ("grant_type", "refresh_token"),
        ])
        .send()
        .and_then(reqwest::blocking::Response::error_for_status)
        .and_then(reqwest::blocking::Response::json)
        .map_err(|error| format!("Google token refresh failed: {error}"))?;
    Ok(response.access_token)
}

fn encrypted_database_snapshot(app: &AppHandle, key: &[u8; 32]) -> Result<String, String> {
    with_temporary_database(app, "backup-snapshot", |path| {
        db::backup_to_file(app, path)?;
        let bytes = fs::read(path).map_err(|error| error.to_string())?;
        let cipher = XChaCha20Poly1305::new(key.into());
        let mut nonce = [0_u8; 24];
        rand::rngs::OsRng.fill_bytes(&mut nonce);
        let encrypted = cipher
            .encrypt(XNonce::from_slice(&nonce), bytes.as_ref())
            .map_err(|_| "Could not encrypt the local database backup.".to_string())?;
        let mut envelope = nonce.to_vec();
        envelope.extend(encrypted);
        Ok(STANDARD.encode(envelope))
    })
}

fn temporary_database_path(app: &AppHandle, purpose: &str) -> Result<PathBuf, String> {
    let path = db::db_path(app)?;
    let name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("rocksoul.sqlite3");
    Ok(path.with_file_name(format!("{name}.{purpose}-{}.sqlite3", Uuid::new_v4())))
}

fn remove_temporary_database(path: &Path) -> Result<(), String> {
    for suffix in ["", "-wal", "-shm"] {
        let candidate = if suffix.is_empty() {
            path.to_path_buf()
        } else {
            let mut name = path.as_os_str().to_os_string();
            name.push(suffix);
            PathBuf::from(name)
        };
        match fs::remove_file(&candidate) {
            Ok(()) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => {
                return Err(format!(
                    "Could not remove temporary database file {}: {error}",
                    candidate.display()
                ))
            }
        }
    }
    Ok(())
}

fn with_temporary_database<T>(
    app: &AppHandle,
    purpose: &str,
    operation: impl FnOnce(&Path) -> Result<T, String>,
) -> Result<T, String> {
    let path = temporary_database_path(app, purpose)?;
    let result = operation(&path);
    let cleanup = remove_temporary_database(&path);
    match (result, cleanup) {
        (Ok(value), Ok(())) => Ok(value),
        (Err(error), Ok(())) => Err(error),
        (Ok(_), Err(error)) => Err(error),
        (Err(error), Err(cleanup_error)) => Err(format!(
            "{error}; temporary database cleanup failed: {cleanup_error}"
        )),
    }
}

fn decrypt_database_snapshot(key: &[u8; 32], encoded: &str) -> Result<Vec<u8>, String> {
    let envelope = STANDARD
        .decode(encoded.trim())
        .map_err(|_| "Google Drive backup payload is not valid base64.".to_string())?;
    if envelope.len() < 24 {
        return Err("Google Drive backup payload is truncated.".into());
    }
    let (nonce, ciphertext) = envelope.split_at(24);
    let cipher = XChaCha20Poly1305::new(key.into());
    let plaintext = cipher
        .decrypt(XNonce::from_slice(nonce), ciphertext)
        .map_err(|_| "Could not decrypt the Google Drive backup with the local key.".to_string())?;
    if !plaintext.starts_with(b"SQLite format 3\0") {
        return Err("Decrypted backup is not a valid SQLite database.".into());
    }
    Ok(plaintext)
}

fn find_backup_file(client: &Client, access_token: &str) -> Result<Option<String>, String> {
    let response: serde_json::Value = client
        .get(format!("{}/files", DRIVE_API))
        .bearer_auth(access_token)
        .query(&[
            ("spaces", "appDataFolder"),
            ("q", "name = 'rocksoul-dx-backup.enc' and trashed = false"),
            ("fields", "nextPageToken,files(id,name)"),
            ("pageSize", "2"),
        ])
        .send()
        .and_then(reqwest::blocking::Response::error_for_status)
        .and_then(reqwest::blocking::Response::json)
        .map_err(|error| format!("Could not find the existing Google Drive backup: {error}"))?;
    let files = response["files"]
        .as_array()
        .ok_or_else(|| "Google Drive returned an invalid backup listing.".to_string())?;
    if files.len() > 1 || response["nextPageToken"].is_string() {
        return Err("Google Drive contains ambiguous backup files.".into());
    }
    Ok(files
        .first()
        .and_then(|file| file["id"].as_str())
        .map(str::to_owned))
}

#[tauri::command]
pub fn backup_to_google_drive(app: AppHandle) -> Result<CloudBackupStatus, String> {
    let connection = db::connect(&app)?;
    let (account, encrypted_refresh, file_id): (String, String, Option<String>) = connection
        .query_row(
            "SELECT google_account, refresh_token_encrypted, remote_file_id
             FROM cloud_backup_settings WHERE id = 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|_| "Connect a Google account before creating a backup.".to_string())?;
    drop(connection);
    let key = backup_key(&app)?;
    let refresh_token = decrypt_secret(&key, &encrypted_refresh)?;
    let client = Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|error| error.to_string())?;
    let token = access_token(&client, &refresh_token)?;
    let encrypted = encrypted_database_snapshot(&app, &key)?;
    let remote_file_id = match file_id {
        Some(file_id) => Some(file_id),
        None => find_backup_file(&client, &token)?,
    };
    let remote_file_id = object_upload(
        &client,
        &token,
        "rocksoul-dx-backup.enc",
        encrypted.as_bytes(),
        "application/octet-stream",
        remote_file_id.as_deref(),
    )?;
    let now = chrono::Utc::now().to_rfc3339();
    let connection = db::connect(&app)?;
    connection.execute(
        "UPDATE cloud_backup_settings SET last_backup_at = ?1, remote_file_id = ?2 WHERE id = 1",
        params![now, remote_file_id],
    ).map_err(|error| error.to_string())?;
    status_from_connection(&connection, true).map(|mut status| {
        status.account = Some(account);
        status
    })
}

#[tauri::command]
pub fn restore_from_google_drive(app: AppHandle) -> Result<CloudBackupStatus, String> {
    let connection = db::connect(&app)?;
    let (_account, encrypted_refresh, file_id): (String, String, Option<String>) = connection
        .query_row(
            "SELECT google_account, refresh_token_encrypted, remote_file_id
             FROM cloud_backup_settings WHERE id = 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|_| "Connect a Google account before restoring a backup.".to_string())?;
    drop(connection);

    let key = backup_key(&app)?;
    let refresh_token = decrypt_secret(&key, &encrypted_refresh)?;
    let client = Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|error| error.to_string())?;
    let token = access_token(&client, &refresh_token)?;
    let remote_file_id = match file_id {
        Some(file_id) => Some(file_id),
        None => find_backup_file(&client, &token)?,
    }
    .ok_or_else(|| "No encrypted backup was found in Google Drive.".to_string())?;

    let encoded = client
        .get(format!("{}/files/{}", DRIVE_API, remote_file_id))
        .bearer_auth(&token)
        .query(&[("alt", "media")])
        .send()
        .and_then(reqwest::blocking::Response::error_for_status)
        .and_then(reqwest::blocking::Response::text)
        .map_err(|error| format!("Could not download Google Drive backup: {error}"))?;

    let sqlite_bytes = decrypt_database_snapshot(&key, &encoded)?;
    with_temporary_database(&app, "restore-source", |path| {
        fs::write(path, &sqlite_bytes).map_err(|error| error.to_string())?;
        db::restore_from_file(&app, path)
    })?;

    let connection = db::connect(&app)?;
    status_from_connection(&connection, true)
}

fn drive_credentials(app: &AppHandle) -> Result<(Client, String), String> {
    let connection = db::connect(app)?;
    let encrypted: String = connection
        .query_row(
            "SELECT refresh_token_encrypted FROM cloud_backup_settings WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .map_err(|_| "Connect a Google account before using the S3 storage gateway.".to_string())?;
    let key = backup_key(app)?;
    let refresh_token = decrypt_secret(&key, &encrypted)?;
    let client = Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|error| error.to_string())?;
    let token = access_token(&client, &refresh_token)?;
    Ok((client, token))
}

fn google_object(
    client: &Client,
    token: &str,
    object_key: &str,
) -> Result<Option<GoogleDriveFile>, String> {
    let name = object_key.replace('\\', "\\\\").replace('\'', "\\'");
    let query = format!("name = '{name}' and trashed = false");
    let response: serde_json::Value = client
        .get(format!("{DRIVE_API}/files"))
        .bearer_auth(token)
        .query(&[
            ("spaces", "appDataFolder"),
            ("q", query.as_str()),
            ("fields", "files(id,name,mimeType,size,modifiedTime)"),
            ("pageSize", "2"),
        ])
        .send()
        .and_then(reqwest::blocking::Response::error_for_status)
        .and_then(reqwest::blocking::Response::json)
        .map_err(|error| format!("Could not find the Google Drive object: {error}"))?;
    let files: Vec<GoogleDriveFile> =
        serde_json::from_value(response["files"].clone()).map_err(|error| error.to_string())?;
    if files.len() > 1 {
        return Err("Google Drive returned multiple objects for one S3 key.".into());
    }
    Ok(files.into_iter().next())
}

fn object_upload(
    client: &Client,
    token: &str,
    object_key: &str,
    bytes: &[u8],
    content_type: &str,
    file_id: Option<&str>,
) -> Result<String, String> {
    let boundary = format!("rocksoul-dx-{}", uuid::Uuid::new_v4().simple());
    let metadata = if file_id.is_some() {
        serde_json::json!({ "name": object_key, "mimeType": content_type })
    } else {
        serde_json::json!({
            "name": object_key,
            "mimeType": content_type,
            "parents": ["appDataFolder"]
        })
    };
    let mut body = format!(
        "--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{}\r\n--{boundary}\r\nContent-Type: {content_type}\r\n\r\n",
        metadata
    )
    .into_bytes();
    body.extend_from_slice(bytes);
    body.extend_from_slice(format!("\r\n--{boundary}--").as_bytes());
    let target = match file_id {
        Some(file_id) => format!("{DRIVE_UPLOAD_API}/files/{file_id}?uploadType=multipart"),
        None => format!("{DRIVE_UPLOAD_API}/files?uploadType=multipart"),
    };
    let method = if file_id.is_some() {
        reqwest::Method::PATCH
    } else {
        reqwest::Method::POST
    };
    let response: serde_json::Value = client
        .request(method, target)
        .bearer_auth(token)
        .header(
            "Content-Type",
            format!("multipart/related; boundary={boundary}"),
        )
        .query(&[("fields", "id,name,mimeType,size,modifiedTime")])
        .body(body)
        .send()
        .and_then(reqwest::blocking::Response::error_for_status)
        .and_then(reqwest::blocking::Response::json)
        .map_err(|error| format!("Google Drive object upload failed: {error}"))?;
    response["id"]
        .as_str()
        .map(str::to_owned)
        .ok_or_else(|| "Google Drive did not return an object ID.".to_string())
}

fn sha256_etag(bytes: &[u8]) -> String {
    format!("\"{}\"", hex_encode(&sha2::Sha256::digest(bytes)))
}

fn hex_encode(bytes: &[u8]) -> String {
    use std::fmt::Write;

    let mut result = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        let _ = write!(result, "{byte:02x}");
    }
    result
}

pub fn validate_s3_object_key(key: &str) -> Result<(), String> {
    if key.is_empty()
        || key.len() > 1024
        || key.contains('\0')
        || key.split('/').any(|segment| segment == "..")
    {
        return Err("Invalid S3 object key.".into());
    }
    Ok(())
}

pub fn s3_put_object(
    app: &AppHandle,
    key: &str,
    bytes: &[u8],
    content_type: Option<&str>,
) -> Result<String, String> {
    validate_s3_object_key(key)?;
    if bytes.len() > 16 * 1024 * 1024 {
        return Err("Objects are limited to 16 MiB.".into());
    }
    let (client, token) = drive_credentials(app)?;
    let existing = google_object(&client, &token, key)?;
    object_upload(
        &client,
        &token,
        key,
        bytes,
        content_type.unwrap_or("application/octet-stream"),
        existing.as_ref().map(|file| file.id.as_str()),
    )?;
    Ok(sha256_etag(bytes))
}

pub fn s3_get_object(
    app: &AppHandle,
    key: &str,
) -> Result<Option<(Vec<u8>, String, String)>, String> {
    validate_s3_object_key(key)?;
    let (client, token) = drive_credentials(app)?;
    let Some(file) = google_object(&client, &token, key)? else {
        return Ok(None);
    };
    let bytes = client
        .get(format!("{DRIVE_API}/files/{}?alt=media", file.id))
        .bearer_auth(&token)
        .send()
        .and_then(reqwest::blocking::Response::error_for_status)
        .and_then(reqwest::blocking::Response::bytes)
        .map_err(|error| format!("Google Drive object download failed: {error}"))?
        .to_vec();
    if bytes.len() > 16 * 1024 * 1024 {
        return Err("Object exceeds the 16 MiB local gateway limit.".into());
    }
    let etag = sha256_etag(&bytes);
    Ok(Some((
        bytes,
        if file.mime_type.is_empty() {
            "application/octet-stream".to_string()
        } else {
            file.mime_type
        },
        etag,
    )))
}

pub fn s3_head_object(
    app: &AppHandle,
    key: &str,
) -> Result<Option<(usize, String, String)>, String> {
    validate_s3_object_key(key)?;
    let (client, token) = drive_credentials(app)?;
    let Some(file) = google_object(&client, &token, key)? else {
        return Ok(None);
    };
    if file.size.parse::<usize>().unwrap_or(usize::MAX) > 16 * 1024 * 1024 {
        return Err("Object exceeds the 16 MiB local gateway limit.".into());
    }
    Ok(Some((
        file.size.parse::<usize>().unwrap_or(0),
        format!("\"{}\"", file.id),
        if file.mime_type.is_empty() {
            "application/octet-stream".to_string()
        } else {
            file.mime_type
        },
    )))
}

pub fn s3_delete_object(app: &AppHandle, key: &str) -> Result<(), String> {
    validate_s3_object_key(key)?;
    let (client, token) = drive_credentials(app)?;
    if let Some(file) = google_object(&client, &token, key)? {
        client
            .delete(format!("{DRIVE_API}/files/{}", file.id))
            .bearer_auth(token)
            .send()
            .and_then(reqwest::blocking::Response::error_for_status)
            .map_err(|error| format!("Google Drive object deletion failed: {error}"))?;
    }
    Ok(())
}

fn xml_escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

pub fn s3_list_objects(app: &AppHandle, request_path: &str) -> Result<String, String> {
    let (client, token) = drive_credentials(app)?;
    let response: serde_json::Value = client
        .get(format!("{DRIVE_API}/files"))
        .bearer_auth(&token)
        .query(&[
            ("spaces", "appDataFolder"),
            ("q", "trashed = false"),
            ("fields", "nextPageToken,files(id,name,size,modifiedTime)"),
            ("pageSize", "1000"),
        ])
        .send()
        .and_then(reqwest::blocking::Response::error_for_status)
        .and_then(reqwest::blocking::Response::json)
        .map_err(|error| format!("Google Drive object listing failed: {error}"))?;
    if response["nextPageToken"].is_string() {
        return Err("Google Drive contains more than one page of S3 objects.".into());
    }
    let prefix = query_parameter(request_path, "prefix").unwrap_or_default();
    let marker = query_parameter(request_path, "start-after").unwrap_or_default();
    let files: Vec<GoogleDriveFile> =
        serde_json::from_value(response["files"].clone()).map_err(|error| error.to_string())?;
    let mut contents = String::new();
    for file in files
        .into_iter()
        .filter(|file| file.name.starts_with(&prefix) && file.name > marker)
    {
        contents.push_str(&format!(
            "<Contents><Key>{}</Key><Size>{}</Size><ETag>&quot;{}&quot;</ETag><LastModified>{}</LastModified></Contents>",
            xml_escape(&file.name),
            file.size.parse::<usize>().unwrap_or(0),
            xml_escape(&file.id),
            xml_escape(&file.modified_time)
        ));
    }
    Ok(format!(
        "<ListBucketResult><Name>{S3_BUCKET}</Name><Prefix>{}</Prefix><IsTruncated>false</IsTruncated>{contents}</ListBucketResult>",
        xml_escape(&prefix)
    ))
}

fn query_parameter(path: &str, name: &str) -> Option<String> {
    let query = path.split_once('?')?.1;
    url::form_urlencoded::parse(query.as_bytes())
        .find(|(key, _)| key == name)
        .map(|(_, value)| value.into_owned())
}

#[cfg(test)]
mod tests {
    use super::{decrypt_secret, encrypt_secret, sha256_etag, validate_s3_object_key, xml_escape};

    #[test]
    fn encrypted_secret_round_trips_and_rejects_tampering() {
        let key = [17_u8; 32];
        let encrypted = encrypt_secret(&key, "refresh-token-fixture").unwrap();
        assert_eq!(
            decrypt_secret(&key, &encrypted).unwrap(),
            "refresh-token-fixture"
        );
        let mut bytes =
            base64::Engine::decode(&base64::engine::general_purpose::STANDARD, encrypted).unwrap();
        let last = bytes.len() - 1;
        bytes[last] ^= 0x80;
        let tampered = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, bytes);
        assert!(decrypt_secret(&key, &tampered).is_err());
    }

    #[test]
    fn object_keys_reject_empty_and_parent_path_segments() {
        assert!(validate_s3_object_key("").is_err());
        assert!(validate_s3_object_key("a/../b").is_err());
        assert!(validate_s3_object_key("a..b/file").is_ok());
    }

    #[test]
    fn etags_are_content_stable_and_xml_is_escaped() {
        assert_eq!(sha256_etag(b"abc"), sha256_etag(b"abc"));
        assert_ne!(sha256_etag(b"abc"), sha256_etag(b"abd"));
        assert_eq!(xml_escape("<&>"), "&lt;&amp;&gt;");
    }

    #[test]
    fn decrypt_database_snapshot_validates_sqlite_header_and_rejects_non_sqlite() {
        use chacha20poly1305::{
            aead::{Aead, KeyInit},
            XChaCha20Poly1305, XNonce,
        };
        let key = [7_u8; 32];
        let cipher = XChaCha20Poly1305::new((&key).into());
        let nonce = [3_u8; 24];
        let mut valid_payload = b"SQLite format 3\0".to_vec();
        valid_payload.extend_from_slice(b"rest-of-db");
        let ct_valid = cipher
            .encrypt(XNonce::from_slice(&nonce), valid_payload.as_ref())
            .unwrap();
        let mut env_valid = nonce.to_vec();
        env_valid.extend(ct_valid);
        let encoded_valid =
            base64::Engine::encode(&base64::engine::general_purpose::STANDARD, env_valid);
        assert_eq!(
            super::decrypt_database_snapshot(&key, &encoded_valid).unwrap(),
            valid_payload
        );

        let ct_bad = cipher
            .encrypt(XNonce::from_slice(&nonce), b"NOT_SQLITE".as_ref())
            .unwrap();
        let mut env_bad = nonce.to_vec();
        env_bad.extend(ct_bad);
        let encoded_bad =
            base64::Engine::encode(&base64::engine::general_purpose::STANDARD, env_bad);
        assert!(super::decrypt_database_snapshot(&key, &encoded_bad).is_err());
    }
}
