use std::{
    collections::HashMap,
    io::{Read, Write},
    net::{SocketAddr, TcpStream},
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    thread,
    time::{Duration, Instant},
};

use chrono::{DateTime, NaiveDateTime, Utc};
use quick_xml::{events::Event, Reader};
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager, State};

use super::cloud_backup;
use crate::models::S3GatewayStatus;

const MAX_OBJECT_BYTES: usize = 16 * 1024 * 1024;
const MAX_HEADER_BYTES: usize = 64 * 1024;
const MAX_ACTIVE_UPLOADS: usize = 2;
const MAX_PENDING_UPLOAD_BYTES: usize = MAX_OBJECT_BYTES * MAX_ACTIVE_UPLOADS;
const MAX_MULTIPART_PARTS: u32 = 10_000;
const MULTIPART_UPLOAD_TTL: Duration = Duration::from_secs(30 * 60);

struct MultipartUpload {
    key: String,
    content_type: Option<String>,
    created_at: Instant,
    size_bytes: usize,
    completing: bool,
    parts: HashMap<u32, MultipartPart>,
}

struct MultipartPart {
    body: Vec<u8>,
    etag: String,
}

struct CompletedPart {
    number: u32,
    etag: String,
}

#[derive(Default)]
struct Runtime {
    shutdown: Option<std::sync::Arc<AtomicBool>>,
    endpoint: Option<String>,
    access_key: Option<String>,
    secret_key: Option<String>,
    uploads: HashMap<String, MultipartUpload>,
    pending_upload_bytes: usize,
}

#[derive(Default)]
pub struct S3GatewayState(Mutex<Runtime>);

#[derive(Debug)]
struct Request {
    method: String,
    path: String,
    headers: HashMap<String, String>,
    body: Vec<u8>,
}

#[tauri::command]
pub fn s3_gateway_status(state: State<'_, S3GatewayState>) -> Result<S3GatewayStatus, String> {
    let runtime = state.0.lock().map_err(|error| error.to_string())?;
    Ok(status(&runtime))
}

#[tauri::command]
pub fn start_s3_gateway(
    app: AppHandle,
    state: State<'_, S3GatewayState>,
) -> Result<S3GatewayStatus, String> {
    let mut runtime = state.0.lock().map_err(|error| error.to_string())?;
    if runtime.shutdown.is_some() {
        return Ok(status(&runtime));
    }

    let listener = std::net::TcpListener::bind("127.0.0.1:0")
        .map_err(|error| format!("Could not bind the local S3 endpoint: {error}"))?;
    listener
        .set_nonblocking(true)
        .map_err(|error| error.to_string())?;
    let endpoint = format!(
        "http://{}",
        listener.local_addr().map_err(|error| error.to_string())?
    );
    let access_key = random_credential(12);
    let secret_key = random_credential(32);
    let shutdown = std::sync::Arc::new(AtomicBool::new(false));
    let worker_shutdown = std::sync::Arc::clone(&shutdown);
    thread::Builder::new()
        .name("rocksoul-s3-gateway".into())
        .spawn(move || {
            while !worker_shutdown.load(Ordering::Acquire) {
                match listener.accept() {
                    Ok((stream, _)) => {
                        let app = app.clone();
                        let address = stream.peer_addr().ok();
                        let _ = thread::Builder::new()
                            .name("rocksoul-s3-request".into())
                            .spawn(move || serve_connection(stream, address, &app));
                    }
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                        thread::sleep(Duration::from_millis(40));
                    }
                    Err(_) => break,
                }
            }
        })
        .map_err(|error| format!("Could not start the local S3 endpoint: {error}"))?;

    runtime.shutdown = Some(shutdown);
    runtime.endpoint = Some(endpoint);
    runtime.access_key = Some(access_key);
    runtime.secret_key = Some(secret_key);
    Ok(status(&runtime))
}

#[tauri::command]
pub fn stop_s3_gateway(state: State<'_, S3GatewayState>) -> Result<S3GatewayStatus, String> {
    let mut runtime = state.0.lock().map_err(|error| error.to_string())?;
    if let Some(shutdown) = runtime.shutdown.take() {
        shutdown.store(true, Ordering::Release);
    }
    runtime.endpoint = None;
    runtime.access_key = None;
    runtime.secret_key = None;
    runtime.uploads.clear();
    runtime.pending_upload_bytes = 0;
    Ok(status(&runtime))
}

fn status(runtime: &Runtime) -> S3GatewayStatus {
    S3GatewayStatus {
        running: runtime.shutdown.is_some(),
        endpoint: runtime.endpoint.clone(),
        bucket: cloud_backup::S3_BUCKET.to_string(),
        access_key: runtime.access_key.clone(),
        secret_key: runtime.secret_key.clone(),
    }
}

fn serve_connection(mut stream: TcpStream, peer: Option<SocketAddr>, app: &AppHandle) {
    let _ = stream.set_read_timeout(Some(Duration::from_secs(8)));
    let _ = stream.set_write_timeout(Some(Duration::from_secs(8)));
    let result = match read_request(&mut stream) {
        Ok(request) => {
            if peer.is_none_or(|address| !address.ip().is_loopback()) {
                xml_error(403, "AccessDenied", "Loopback clients only")
            } else {
                handle_request(request, app)
            }
        }
        Err((status, code, message)) => xml_error(status, code, message),
    };
    let _ = stream.write_all(&result);
    let _ = stream.flush();
}

fn read_request(stream: &mut TcpStream) -> Result<Request, (u16, &'static str, &'static str)> {
    let mut bytes = Vec::new();
    let mut buffer = [0_u8; 8192];
    let header_end = loop {
        let count = stream
            .read(&mut buffer)
            .map_err(|_| (400, "InvalidRequest", "Could not read request"))?;
        if count == 0 {
            return Err((400, "InvalidRequest", "Incomplete request"));
        }
        bytes.extend_from_slice(&buffer[..count]);
        if bytes.len() > MAX_OBJECT_BYTES + MAX_HEADER_BYTES {
            return Err((
                413,
                "EntityTooLarge",
                "Request exceeds the local gateway limit",
            ));
        }
        if let Some(index) = bytes.windows(4).position(|window| window == b"\r\n\r\n") {
            break index + 4;
        }
    };
    let header = std::str::from_utf8(&bytes[..header_end])
        .map_err(|_| (400, "InvalidRequest", "Invalid request headers"))?;
    let mut lines = header.split("\r\n");
    let mut start = lines
        .next()
        .ok_or((400, "InvalidRequest", "Missing request line"))?
        .split_whitespace();
    let method = start
        .next()
        .ok_or((400, "InvalidRequest", "Missing method"))?
        .to_string();
    let path = start
        .next()
        .ok_or((400, "InvalidRequest", "Missing path"))?
        .to_string();
    let mut headers = HashMap::new();
    for line in lines.filter(|line| !line.is_empty()) {
        let (name, value) =
            line.split_once(':')
                .ok_or((400, "InvalidRequest", "Malformed header"))?;
        headers.insert(name.trim().to_ascii_lowercase(), value.trim().to_string());
    }
    if headers.contains_key("transfer-encoding") {
        return Err((501, "NotImplemented", "Chunked transfer is unsupported"));
    }
    let content_length = headers
        .get("content-length")
        .map(|value| value.parse::<usize>())
        .transpose()
        .map_err(|_| (400, "InvalidRequest", "Invalid content length"))?
        .unwrap_or(0);
    if content_length > MAX_OBJECT_BYTES {
        return Err((413, "EntityTooLarge", "Object exceeds 16 MiB"));
    }
    let mut body = bytes[header_end..].to_vec();
    while body.len() < content_length {
        let count = stream
            .read(&mut buffer)
            .map_err(|_| (400, "InvalidRequest", "Could not read request body"))?;
        if count == 0 {
            return Err((400, "InvalidRequest", "Incomplete request body"));
        }
        body.extend_from_slice(&buffer[..count]);
    }
    body.truncate(content_length);
    Ok(Request {
        method,
        path,
        headers,
        body,
    })
}

fn handle_request(request: Request, app: &AppHandle) -> Vec<u8> {
    let credentials = app.state::<S3GatewayState>();
    let (expected_access, expected_secret) = match credentials.0.lock() {
        Ok(mut runtime) => {
            expire_uploads(&mut runtime);
            (runtime.access_key.clone(), runtime.secret_key.clone())
        }
        Err(_) => return xml_error(503, "ServiceUnavailable", "Gateway state unavailable"),
    };
    if !authorized(
        &request,
        expected_access.as_deref().unwrap_or_default(),
        expected_secret.as_deref().unwrap_or_default(),
    ) {
        return xml_error(403, "SignatureDoesNotMatch", "S3 authentication failed");
    }
    let (bucket, key) = match parse_path(&request.path) {
        Ok(path) => path,
        Err(_) => return xml_error(400, "InvalidURI", "Invalid request path"),
    };
    if bucket.is_none() {
        return match request.method.as_str() {
            "GET" => xml_response(
                200,
                "<ListAllMyBucketsResult><Buckets><Bucket><Name>rocksoul</Name></Bucket></Buckets></ListAllMyBucketsResult>",
            ),
            _ => xml_error(405, "MethodNotAllowed", "Unsupported service operation"),
        };
    }
    if bucket.as_deref() != Some(cloud_backup::S3_BUCKET) {
        return xml_error(404, "NoSuchBucket", "Bucket does not exist");
    }
    let Some(key) = key else {
        return match request.method.as_str() {
            "PUT" | "HEAD" => response(200, b"", &[("Content-Type", "application/xml")]),
            "GET" => match cloud_backup::s3_list_objects(app, &request.path) {
                Ok(body) => xml_response(200, &body),
                Err(_) => storage_unavailable(),
            },
            "DELETE" => xml_error(405, "MethodNotAllowed", "Bucket deletion is unsupported"),
            _ => xml_error(405, "MethodNotAllowed", "Unsupported bucket operation"),
        };
    };
    if let Err(message) = cloud_backup::validate_s3_object_key(&key) {
        return xml_error(400, "InvalidArgument", &message);
    }
    let query = request.path.split_once('?').map(|(_, q)| q).unwrap_or("");
    if request.method == "POST"
        && query
            .split('&')
            .any(|parameter| parameter == "uploads" || parameter == "uploads=")
    {
        let content_type = request.headers.get("content-type").cloned();
        let state = app.state::<S3GatewayState>();
        let Ok(mut runtime) = state.0.lock() else {
            return xml_error(503, "ServiceUnavailable", "Gateway state unavailable");
        };
        if runtime.uploads.len() >= MAX_ACTIVE_UPLOADS {
            return xml_error(
                409,
                "TooManyUploads",
                "Too many multipart uploads are active",
            );
        }
        let upload_id = random_credential(16);
        runtime.uploads.insert(
            upload_id.clone(),
            MultipartUpload {
                key: key.clone(),
                content_type,
                created_at: Instant::now(),
                size_bytes: 0,
                completing: false,
                parts: HashMap::new(),
            },
        );
        return xml_response(
            200,
            &format!(
                "<InitiateMultipartUploadResult><Bucket>{}</Bucket><Key>{}</Key><UploadId>{}</UploadId></InitiateMultipartUploadResult>",
                cloud_backup::S3_BUCKET,
                xml_escape(&key),
                xml_escape(&upload_id)
            ),
        );
    }
    if let Some(upload_id) = query
        .split('&')
        .find_map(|p| p.strip_prefix("uploadId="))
        .filter(|id| !id.is_empty())
    {
        if request.method == "PUT" {
            let Some(part_num) = query
                .split('&')
                .find_map(|p| p.strip_prefix("partNumber="))
                .and_then(|n| n.parse::<u32>().ok())
                .filter(|&n| (1..=MAX_MULTIPART_PARTS).contains(&n))
            else {
                return xml_error(
                    400,
                    "InvalidArgument",
                    "Missing or invalid partNumber; expected 1 through 10000",
                );
            };
            let state = app.state::<S3GatewayState>();
            let Ok(mut runtime) = state.0.lock() else {
                return xml_error(503, "ServiceUnavailable", "Gateway state unavailable");
            };
            let etag =
                match store_upload_part(&mut runtime, upload_id, &key, part_num, request.body) {
                    Ok(etag) => etag,
                    Err((status, code, message)) => return xml_error(status, code, message),
                };
            return response(200, b"", &[("ETag", &etag)]);
        }
        if request.method == "POST" {
            let completed_parts = match parse_completion_manifest(&request.body) {
                Ok(parts) => parts,
                Err(message) => return xml_error(400, "InvalidRequest", &message),
            };
            let assembled = {
                let state = app.state::<S3GatewayState>();
                let Ok(mut runtime) = state.0.lock() else {
                    return xml_error(503, "ServiceUnavailable", "Gateway state unavailable");
                };
                let Some(upload) = runtime.uploads.get_mut(upload_id) else {
                    return xml_error(404, "NoSuchUpload", "Multipart upload not found");
                };
                if upload.key != key {
                    return xml_error(400, "InvalidArgument", "Upload key mismatch");
                }
                if upload.completing {
                    return xml_error(409, "OperationAborted", "Multipart upload is completing");
                }
                let combined = match assemble_parts(upload, &completed_parts) {
                    Ok(combined) => combined,
                    Err((code, message)) => return xml_error(400, code, message),
                };
                upload.completing = true;
                (combined, upload.content_type.clone())
            };
            let (assembled, content_type) = assembled;
            return match cloud_backup::s3_put_object(app, &key, &assembled, content_type.as_deref())
            {
                Ok(etag) => {
                    if let Ok(mut runtime) = app.state::<S3GatewayState>().0.lock() {
                        if let Some(upload) = runtime.uploads.remove(upload_id) {
                            runtime.pending_upload_bytes = runtime
                                .pending_upload_bytes
                                .saturating_sub(upload.size_bytes);
                        }
                    }
                    xml_response(
                        200,
                        &format!(
                            "<CompleteMultipartUploadResult><Bucket>{}</Bucket><Key>{}</Key><ETag>{}</ETag></CompleteMultipartUploadResult>",
                            cloud_backup::S3_BUCKET,
                            xml_escape(&key),
                            xml_escape(&etag)
                        ),
                    )
                }
                Err(_) => {
                    if let Ok(mut runtime) = app.state::<S3GatewayState>().0.lock() {
                        if let Some(upload) = runtime.uploads.get_mut(upload_id) {
                            upload.completing = false;
                        }
                    }
                    storage_unavailable()
                }
            };
        }
        if request.method == "DELETE" {
            let state = app.state::<S3GatewayState>();
            let Ok(mut runtime) = state.0.lock() else {
                return xml_error(503, "ServiceUnavailable", "Gateway state unavailable");
            };
            let Some(upload) = runtime.uploads.get(upload_id) else {
                return xml_error(404, "NoSuchUpload", "Multipart upload not found");
            };
            if upload.completing {
                return xml_error(409, "OperationAborted", "Multipart upload is completing");
            }
            if let Some(upload) = runtime.uploads.remove(upload_id) {
                runtime.pending_upload_bytes = runtime
                    .pending_upload_bytes
                    .saturating_sub(upload.size_bytes);
            }
            return response(204, b"", &[]);
        }
    }
    match request.method.as_str() {
        "PUT" => match cloud_backup::s3_put_object(
            app,
            &key,
            &request.body,
            request.headers.get("content-type").map(String::as_str),
        ) {
            Ok(etag) => response(200, b"", &[("ETag", &etag)]),
            Err(_) => storage_unavailable(),
        },
        "GET" => match cloud_backup::s3_get_object(app, &key) {
            Ok(Some((body, content_type, etag))) => {
                binary_response(200, &body, &content_type, &etag)
            }
            Ok(None) => xml_error(404, "NoSuchKey", "Object does not exist"),
            Err(_) => storage_unavailable(),
        },
        "HEAD" => match cloud_backup::s3_head_object(app, &key) {
            Ok(Some((size, etag, content_type))) => response_with_length(
                200,
                b"",
                size,
                &[("ETag", &etag), ("Content-Type", &content_type)],
            ),
            Ok(None) => xml_error(404, "NoSuchKey", "Object does not exist"),
            Err(_) => storage_unavailable(),
        },
        "DELETE" => match cloud_backup::s3_delete_object(app, &key) {
            Ok(()) => response(204, b"", &[]),
            Err(_) => storage_unavailable(),
        },
        _ => xml_error(405, "MethodNotAllowed", "Unsupported object operation"),
    }
}

fn assemble_parts(
    upload: &MultipartUpload,
    completed_parts: &[CompletedPart],
) -> Result<Vec<u8>, (&'static str, &'static str)> {
    let mut previous_number = 0;
    for completed in completed_parts {
        if completed.number <= previous_number {
            return Err((
                "InvalidPartOrder",
                "Parts must be listed once in ascending order",
            ));
        }
        previous_number = completed.number;
    }
    if completed_parts.len() > upload.parts.len() {
        return Err(("InvalidPart", "A requested part is missing"));
    }
    let last_number = completed_parts.last().map_or(0, |part| part.number);
    let mut combined = Vec::new();
    for completed in completed_parts {
        let Some(part) = upload.parts.get(&completed.number) else {
            return Err(("InvalidPart", "A requested part is missing"));
        };
        if part.etag != completed.etag {
            return Err(("InvalidPart", "A requested part ETag does not match"));
        }
        if completed.number != last_number && part.body.len() < 5 * 1024 * 1024 {
            return Err((
                "EntityTooSmall",
                "Every multipart part except the last must be at least 5 MiB",
            ));
        }
        if combined.len().saturating_add(part.body.len()) > MAX_OBJECT_BYTES {
            return Err(("EntityTooLarge", "Assembled object exceeds 16 MiB limit"));
        }
        combined.extend_from_slice(&part.body);
    }
    Ok(combined)
}

fn store_upload_part(
    runtime: &mut Runtime,
    upload_id: &str,
    key: &str,
    part_number: u32,
    body: Vec<u8>,
) -> Result<String, (u16, &'static str, &'static str)> {
    let Some(upload) = runtime.uploads.get(upload_id) else {
        return Err((404, "NoSuchUpload", "Multipart upload not found"));
    };
    if upload.key != key {
        return Err((400, "InvalidArgument", "Upload key mismatch"));
    }
    if upload.completing {
        return Err((409, "OperationAborted", "Multipart upload is completing"));
    }
    if !(1..=MAX_MULTIPART_PARTS).contains(&part_number) {
        return Err((400, "InvalidArgument", "Multipart part number is invalid"));
    }
    if !upload.parts.contains_key(&part_number)
        && upload.parts.len() >= MAX_MULTIPART_PARTS as usize
    {
        return Err((
            400,
            "InvalidArgument",
            "Multipart upload has too many parts",
        ));
    }
    let old_size = upload
        .parts
        .get(&part_number)
        .map_or(0, |part| part.body.len());
    let Some(new_upload_size) = upload
        .size_bytes
        .checked_sub(old_size)
        .and_then(|size| size.checked_add(body.len()))
    else {
        return Err((503, "ServiceUnavailable", "Multipart accounting failed"));
    };
    if new_upload_size > MAX_OBJECT_BYTES {
        return Err((
            413,
            "EntityTooLarge",
            "Multipart object exceeds the 16 MiB limit",
        ));
    }
    let Some(new_pending_size) = runtime
        .pending_upload_bytes
        .checked_sub(old_size)
        .and_then(|size| size.checked_add(body.len()))
    else {
        return Err((503, "ServiceUnavailable", "Multipart accounting failed"));
    };
    if new_pending_size > MAX_PENDING_UPLOAD_BYTES {
        return Err((
            413,
            "EntityTooLarge",
            "Active multipart data exceeds the 32 MiB gateway limit",
        ));
    }
    let etag = format!("\"{}\"", hex_encode(&Sha256::digest(&body)));
    let upload = match runtime.uploads.get_mut(upload_id) {
        Some(upload) => upload,
        None => return Err((404, "NoSuchUpload", "Multipart upload not found")),
    };
    upload.size_bytes = new_upload_size;
    upload.parts.insert(
        part_number,
        MultipartPart {
            body,
            etag: etag.clone(),
        },
    );
    runtime.pending_upload_bytes = new_pending_size;
    Ok(etag)
}

fn expire_uploads(runtime: &mut Runtime) {
    let now = Instant::now();
    let expired: Vec<String> = runtime
        .uploads
        .iter()
        .filter(|(_, upload)| {
            now.saturating_duration_since(upload.created_at) >= MULTIPART_UPLOAD_TTL
        })
        .map(|(id, _)| id.clone())
        .collect();
    for id in expired {
        if let Some(upload) = runtime.uploads.remove(&id) {
            runtime.pending_upload_bytes = runtime
                .pending_upload_bytes
                .saturating_sub(upload.size_bytes);
        }
    }
}

fn parse_completion_manifest(body: &[u8]) -> Result<Vec<CompletedPart>, String> {
    let xml = std::str::from_utf8(body).map_err(|error| error.to_string())?;
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);
    let mut root_seen = false;
    let mut root_open = false;
    let mut root_closed = false;
    let mut in_part = false;
    let mut part_number = None;
    let mut etag = None;
    let mut capture: Option<&str> = None;
    let mut text = String::new();
    let mut parts = Vec::new();

    loop {
        match reader.read_event().map_err(|error| error.to_string())? {
            Event::Start(element) => match element.name().as_ref() {
                "CompleteMultipartUpload" if !root_seen && !root_closed => {
                    root_seen = true;
                    root_open = true;
                }
                "Part" if root_open && !in_part => {
                    in_part = true;
                    part_number = None;
                    etag = None;
                }
                "PartNumber" if in_part && capture.is_none() && part_number.is_none() => {
                    capture = Some("PartNumber");
                    text.clear();
                }
                "ETag" if in_part && capture.is_none() && etag.is_none() => {
                    capture = Some("ETag");
                    text.clear();
                }
                _ => return Err("Multipart manifest contains an unexpected element.".into()),
            },
            Event::Text(value) => {
                let decoded = value.xml10_content();
                if capture.is_some() {
                    let decoded =
                        quick_xml::escape::unescape(&decoded).map_err(|error| error.to_string())?;
                    text.push_str(&decoded);
                } else if !decoded.trim().is_empty() {
                    return Err("Multipart manifest contains unexpected text.".into());
                }
            }
            Event::GeneralRef(reference) => {
                let character = xml_reference_char(reference.as_ref())?;
                if capture.is_some() {
                    text.push(character);
                } else if !character.is_whitespace() {
                    return Err("Multipart manifest contains unexpected text.".into());
                }
            }
            Event::End(element) => match element.name().as_ref() {
                "PartNumber" if capture == Some("PartNumber") => {
                    let number = text
                        .trim()
                        .parse::<u32>()
                        .map_err(|_| "Multipart part number is invalid.".to_string())?;
                    if !(1..=MAX_MULTIPART_PARTS).contains(&number) {
                        return Err("Multipart part number is outside the allowed range.".into());
                    }
                    part_number = Some(number);
                    capture = None;
                }
                "ETag" if capture == Some("ETag") => {
                    let value = text.trim();
                    if value.is_empty() || value.len() > 256 {
                        return Err("Multipart part ETag is invalid.".into());
                    }
                    etag = Some(value.to_string());
                    capture = None;
                }
                "Part" if in_part && capture.is_none() => {
                    let (Some(number), Some(etag)) = (part_number.take(), etag.take()) else {
                        return Err("Each multipart part needs a number and ETag.".into());
                    };
                    parts.push(CompletedPart { number, etag });
                    if parts.len() > MAX_MULTIPART_PARTS as usize {
                        return Err("Multipart manifest contains too many parts.".into());
                    }
                    in_part = false;
                }
                "CompleteMultipartUpload" if root_open && !in_part && capture.is_none() => {
                    root_open = false;
                    root_closed = true;
                }
                _ => return Err("Multipart manifest structure is invalid.".into()),
            },
            Event::DocType(_) => {
                return Err("Multipart manifest document types are not supported.".into())
            }
            Event::Empty(_) | Event::CData(_) => {
                return Err("Multipart manifest contains unsupported XML content.".into())
            }
            Event::Eof => break,
            _ => {}
        }
    }

    if !root_seen || !root_closed || in_part || parts.is_empty() {
        return Err("Multipart completion manifest is incomplete.".into());
    }
    Ok(parts)
}

fn xml_reference_char(reference: &str) -> Result<char, String> {
    let value = match reference {
        "amp" => return Ok('&'),
        "lt" => return Ok('<'),
        "gt" => return Ok('>'),
        "apos" => return Ok('\''),
        "quot" => return Ok('"'),
        reference if reference.starts_with("#x") => u32::from_str_radix(&reference[2..], 16),
        reference if reference.starts_with('#') => reference[1..].parse::<u32>(),
        _ => return Err("Multipart manifest contains an unsupported entity.".into()),
    }
    .map_err(|error| error.to_string())?;
    char::from_u32(value).ok_or_else(|| "Multipart manifest contains an invalid character.".into())
}

fn parse_path(path: &str) -> Result<(Option<String>, Option<String>), String> {
    let (path, _) = path.split_once('?').unwrap_or((path, ""));
    let path = path.trim_start_matches('/');
    if path.is_empty() {
        return Ok((None, None));
    }
    let (bucket, key) = path.split_once('/').unwrap_or((path, ""));
    Ok((
        Some(percent_decode(bucket)?),
        if key.is_empty() {
            None
        } else {
            Some(percent_decode(key)?)
        },
    ))
}

fn percent_decode(value: &str) -> Result<String, String> {
    let mut decoded = Vec::with_capacity(value.len());
    let bytes = value.as_bytes();
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' {
            if index + 2 >= bytes.len() {
                return Err("Malformed percent escape".into());
            }
            let digits = std::str::from_utf8(&bytes[index + 1..index + 3])
                .map_err(|error| error.to_string())?;
            decoded.push(u8::from_str_radix(digits, 16).map_err(|error| error.to_string())?);
            index += 3;
        } else {
            decoded.push(bytes[index]);
            index += 1;
        }
    }
    String::from_utf8(decoded).map_err(|error| error.to_string())
}

fn storage_unavailable() -> Vec<u8> {
    xml_error(
        503,
        "ServiceUnavailable",
        "Google Drive storage is unavailable",
    )
}

fn xml_response(status: u16, body: &str) -> Vec<u8> {
    response(
        status,
        body.as_bytes(),
        &[("Content-Type", "application/xml")],
    )
}

fn xml_error(status: u16, code: &str, message: &str) -> Vec<u8> {
    xml_response(
        status,
        &format!(
            "<Error><Code>{}</Code><Message>{}</Message></Error>",
            xml_escape(code),
            xml_escape(message)
        ),
    )
}

fn xml_escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

fn binary_response(status: u16, body: &[u8], content_type: &str, etag: &str) -> Vec<u8> {
    let mut bytes = format!(
        "HTTP/1.1 {status} {}\r\nContent-Length: {}\r\nContent-Type: {}\r\nETag: {}\r\nConnection: close\r\n\r\n",
        reason(status),
        body.len(),
        content_type,
        etag
    )
    .into_bytes();
    bytes.extend_from_slice(body);
    bytes
}

fn response_with_length(
    status: u16,
    body: &[u8],
    length: usize,
    headers: &[(&str, &str)],
) -> Vec<u8> {
    let mut result = format!(
        "HTTP/1.1 {status} {}\r\nContent-Length: {length}\r\nConnection: close\r\n",
        reason(status)
    );
    for (name, value) in headers {
        result.push_str(&format!("{name}: {value}\r\n"));
    }
    result.push_str("\r\n");
    let mut bytes = result.into_bytes();
    bytes.extend_from_slice(body);
    bytes
}

fn response(status: u16, body: &[u8], headers: &[(&str, &str)]) -> Vec<u8> {
    let mut result = format!(
        "HTTP/1.1 {status} {}\r\nContent-Length: {}\r\nConnection: close\r\n",
        reason(status),
        body.len()
    );
    for (name, value) in headers {
        result.push_str(&format!("{name}: {value}\r\n"));
    }
    result.push_str("\r\n");
    let mut bytes = result.into_bytes();
    bytes.extend_from_slice(body);
    bytes
}

fn reason(status: u16) -> &'static str {
    match status {
        200 => "OK",
        204 => "No Content",
        409 => "Conflict",
        403 => "Forbidden",
        400 => "Bad Request",
        404 => "Not Found",
        405 => "Method Not Allowed",
        413 => "Payload Too Large",
        501 => "Not Implemented",
        503 => "Service Unavailable",
        401 => "Unauthorized",
        _ => "Error",
    }
}

fn random_credential(length: usize) -> String {
    use rand::RngCore;

    let mut bytes = vec![0_u8; length];
    rand::rngs::OsRng.fill_bytes(&mut bytes);
    base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, bytes)
}

fn authorized(request: &Request, access_key: &str, secret_key: &str) -> bool {
    authorized_at(request, access_key, secret_key, Utc::now())
}

fn authorized_at(
    request: &Request,
    access_key: &str,
    secret_key: &str,
    now: DateTime<Utc>,
) -> bool {
    if access_key.is_empty() || secret_key.is_empty() || request.path.is_empty() {
        return false;
    }
    let Some(header) = request.headers.get("authorization") else {
        return false;
    };
    let expected_bearer = format!("Bearer {secret_key}");
    if constant_time_eq(header.as_bytes(), expected_bearer.as_bytes()) {
        return true;
    }
    if header.starts_with("AWS4-HMAC-SHA256 ") {
        return verify_sigv4(request, access_key, secret_key, header, now);
    }
    false
}

fn hmac_sha256(key: &[u8], data: &[u8]) -> [u8; 32] {
    let mut k_pad = [0_u8; 64];
    if key.len() > 64 {
        let hashed = Sha256::digest(key);
        k_pad[..32].copy_from_slice(&hashed);
    } else {
        k_pad[..key.len()].copy_from_slice(key);
    }
    let mut ipad = [0x36_u8; 64];
    let mut opad = [0x5c_u8; 64];
    for i in 0..64 {
        ipad[i] ^= k_pad[i];
        opad[i] ^= k_pad[i];
    }
    let mut inner = Sha256::new();
    inner.update(ipad);
    inner.update(data);
    let inner_hash = inner.finalize();
    let mut outer = Sha256::new();
    outer.update(opad);
    outer.update(inner_hash);
    outer.finalize().into()
}

fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn canonical_query(raw_query: &str) -> Option<String> {
    if raw_query.is_empty() {
        return Some(String::new());
    }
    let mut pairs = Vec::new();
    for pair in raw_query.split('&') {
        let (key, value) = pair.split_once('=').unwrap_or((pair, ""));
        let key = aws_encode(&percent_decode(key).ok()?);
        let value = aws_encode(&percent_decode(value).ok()?);
        pairs.push((key, value));
    }
    pairs.sort();
    Some(
        pairs
            .into_iter()
            .map(|(key, value)| format!("{key}={value}"))
            .collect::<Vec<_>>()
            .join("&"),
    )
}

fn aws_encode(value: &str) -> String {
    let mut encoded = String::new();
    for byte in value.bytes() {
        if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b'~') {
            encoded.push(byte as char);
        } else {
            encoded.push_str(&format!("%{byte:02X}"));
        }
    }
    encoded
}

fn verify_sigv4(
    request: &Request,
    access_key: &str,
    secret_key: &str,
    header: &str,
    now: DateTime<Utc>,
) -> bool {
    let rest = header.trim_start_matches("AWS4-HMAC-SHA256 ").trim();
    let mut credential = None;
    let mut signed_headers = None;
    let mut signature = None;
    for part in rest.split(',') {
        let part = part.trim();
        if let Some(val) = part.strip_prefix("Credential=") {
            credential = Some(val);
        } else if let Some(val) = part.strip_prefix("SignedHeaders=") {
            signed_headers = Some(val);
        } else if let Some(val) = part.strip_prefix("Signature=") {
            signature = Some(val);
        }
    }
    let (Some(cred), Some(signed_hdrs), Some(sig)) = (credential, signed_headers, signature) else {
        return false;
    };
    let cred_parts: Vec<&str> = cred.split('/').collect();
    if cred_parts.len() != 5 || cred_parts[0] != access_key || cred_parts[4] != "aws4_request" {
        return false;
    }
    let (date_stamp, region, service) = (cred_parts[1], cred_parts[2], cred_parts[3]);
    if date_stamp.len() != 8 || region.is_empty() || service != "s3" {
        return false;
    }
    let amz_date = match request.headers.get("x-amz-date") {
        Some(d) => d.as_str(),
        None => return false,
    };
    let parsed_date = match NaiveDateTime::parse_from_str(amz_date, "%Y%m%dT%H%M%SZ") {
        Ok(date) => date.and_utc(),
        Err(_) => return false,
    };
    if parsed_date.format("%Y%m%d").to_string() != date_stamp
        || !(-900..=900).contains(&now.signed_duration_since(parsed_date).num_seconds())
    {
        return false;
    }

    let header_names: Vec<&str> = signed_hdrs.split(';').collect();
    if header_names.is_empty()
        || header_names
            .iter()
            .any(|name| name.is_empty() || name.to_ascii_lowercase() != *name)
        || header_names.windows(2).any(|pair| pair[0] >= pair[1])
        || !header_names.contains(&"host")
        || !header_names.contains(&"x-amz-date")
    {
        return false;
    }

    let (raw_path, raw_query) = request
        .path
        .split_once('?')
        .unwrap_or((request.path.as_str(), ""));
    if !raw_path.starts_with('/') {
        return false;
    }
    let Some(canonical_query) = canonical_query(raw_query) else {
        return false;
    };

    let mut canonical_headers = String::new();
    for name in &header_names {
        let Some(value) = request.headers.get(*name) else {
            return false;
        };
        let normalized_value = value.split_whitespace().collect::<Vec<_>>().join(" ");
        canonical_headers.push_str(&format!("{name}:{normalized_value}\n"));
    }
    let payload_hash = hex_encode(&Sha256::digest(&request.body));
    if request
        .headers
        .get("x-amz-content-sha256")
        .is_some_and(|header_hash| header_hash != &payload_hash)
    {
        return false;
    }
    let canonical_request = format!(
        "{}\n{raw_path}\n{canonical_query}\n{canonical_headers}\n{signed_hdrs}\n{payload_hash}",
        request.method
    );
    let scope = format!("{date_stamp}/{region}/{service}/aws4_request");
    let string_to_sign = format!(
        "AWS4-HMAC-SHA256\n{amz_date}\n{scope}\n{}",
        hex_encode(&Sha256::digest(canonical_request.as_bytes()))
    );

    let k_date = hmac_sha256(
        format!("AWS4{secret_key}").as_bytes(),
        date_stamp.as_bytes(),
    );
    let k_region = hmac_sha256(&k_date, region.as_bytes());
    let k_service = hmac_sha256(&k_region, service.as_bytes());
    let k_signing = hmac_sha256(&k_service, b"aws4_request");
    let expected_sig = hex_encode(&hmac_sha256(&k_signing, string_to_sign.as_bytes()));
    constant_time_eq(sig.as_bytes(), expected_sig.as_bytes())
}

fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut difference = 0_u8;
    for (left, right) in a.iter().zip(b) {
        difference |= left ^ right;
    }
    difference == 0
}

#[cfg(test)]
mod tests {
    use super::{
        assemble_parts, constant_time_eq, expire_uploads, parse_completion_manifest, parse_path,
        percent_decode, store_upload_part, xml_error, xml_escape, CompletedPart, MultipartPart,
        MultipartUpload, Request, Runtime, MAX_OBJECT_BYTES, MAX_PENDING_UPLOAD_BYTES,
        MULTIPART_UPLOAD_TTL,
    };
    use std::collections::HashMap;
    use std::time::{Duration, Instant};

    #[test]
    fn parses_nested_object_paths_and_bucket_paths() {
        assert_eq!(
            parse_path("/rocksoul").unwrap(),
            (Some("rocksoul".into()), None)
        );
        assert_eq!(
            parse_path("/rocksoul/folder/file.txt").unwrap(),
            (Some("rocksoul".into()), Some("folder/file.txt".into()))
        );
    }

    #[test]
    fn decodes_encoded_path_without_changing_plus() {
        assert_eq!(percent_decode("a%20b+c").unwrap(), "a b+c");
    }

    #[test]
    fn rejects_invalid_encoding_and_escapes_xml() {
        assert!(percent_decode("%FF").is_err());
        assert_eq!(xml_escape("<&>"), "&lt;&amp;&gt;");
    }

    #[test]
    fn loopback_only_and_bearer_secret_are_enforced() {
        let request = Request {
            method: "GET".into(),
            path: "/rocksoul/object".into(),
            headers: [("authorization".into(), "Bearer secret".into())]
                .into_iter()
                .collect(),
            body: Vec::new(),
        };
        assert!(super::authorized(&request, "access", "secret"));
        assert!(!super::authorized(&request, "access", "other"));
        let anonymous = Request {
            headers: Default::default(),
            ..request
        };
        assert!(!super::authorized(&anonymous, "access", "secret"));
    }

    #[test]
    fn constant_time_comparison_rejects_different_lengths() {
        assert!(constant_time_eq(b"abc", b"abc"));
        assert!(!constant_time_eq(b"abc", b"abd"));
        assert!(!constant_time_eq(b"abc", b"abcd"));
    }

    #[test]
    fn error_payloads_are_s3_compatible_xml() {
        let body = String::from_utf8(xml_error(404, "NoSuchKey", "missing")).unwrap();
        assert!(body.starts_with("HTTP/1.1 404 Not Found"));
        assert!(body.contains("<Code>NoSuchKey</Code>"));
        assert!(body.contains("<Message>missing</Message>"));
    }

    #[test]
    fn multipart_manifest_requires_complete_valid_xml() {
        let parts = parse_completion_manifest(
            br#"<CompleteMultipartUpload><Part><PartNumber>1</PartNumber><ETag>"one"</ETag></Part><Part><PartNumber>2</PartNumber><ETag>"two"</ETag></Part></CompleteMultipartUpload>"#,
        )
        .expect("valid manifest should parse");
        assert_eq!(parts.len(), 2);
        assert_eq!(parts[0].number, 1);
        assert_eq!(parts[1].etag, "\"two\"");
        assert!(parse_completion_manifest(
            b"<CompleteMultipartUpload><Part><PartNumber>1</PartNumber></Part></CompleteMultipartUpload>"
        )
        .is_err());
        assert!(parse_completion_manifest(
            b"<!DOCTYPE x><CompleteMultipartUpload><Part><PartNumber>1</PartNumber><ETag>x</ETag></Part></CompleteMultipartUpload>"
        )
        .is_err());
        let escaped = parse_completion_manifest(
            br#"<CompleteMultipartUpload><Part><PartNumber>1&#x31;</PartNumber><ETag>&quot;one&quot;</ETag></Part></CompleteMultipartUpload>"#,
        )
        .expect("escaped manifest values should decode");
        assert_eq!(escaped[0].number, 11);
        assert_eq!(escaped[0].etag, "\"one\"");
    }

    #[test]
    fn multipart_completion_checks_order_etags_and_expiration_releases_memory() {
        let upload = MultipartUpload {
            key: "object".into(),
            content_type: None,
            created_at: Instant::now(),
            size_bytes: 9,
            completing: false,
            parts: [
                (
                    1,
                    MultipartPart {
                        body: b"first".to_vec(),
                        etag: "\"etag-1\"".into(),
                    },
                ),
                (
                    2,
                    MultipartPart {
                        body: b"last".to_vec(),
                        etag: "\"etag-2\"".into(),
                    },
                ),
            ]
            .into_iter()
            .collect(),
        };
        assert_eq!(
            assemble_parts(
                &upload,
                &[CompletedPart {
                    number: 2,
                    etag: "\"etag-2\"".into(),
                }]
            )
            .expect("single last part should assemble"),
            b"last"
        );
        assert_eq!(
            assemble_parts(
                &upload,
                &[
                    CompletedPart {
                        number: 2,
                        etag: "\"etag-2\"".into(),
                    },
                    CompletedPart {
                        number: 1,
                        etag: "\"etag-1\"".into(),
                    },
                ]
            )
            .unwrap_err()
            .0,
            "InvalidPartOrder"
        );
        assert_eq!(
            assemble_parts(
                &upload,
                &[CompletedPart {
                    number: 1,
                    etag: "\"tampered\"".into(),
                }]
            )
            .unwrap_err()
            .0,
            "InvalidPart"
        );

        let mut runtime = Runtime {
            pending_upload_bytes: 4,
            ..Runtime::default()
        };
        runtime.uploads.insert(
            "expired".into(),
            MultipartUpload {
                key: "object".into(),
                content_type: None,
                created_at: Instant::now() - MULTIPART_UPLOAD_TTL - Duration::from_secs(1),
                size_bytes: 4,
                completing: false,
                parts: HashMap::new(),
            },
        );
        expire_uploads(&mut runtime);
        assert!(runtime.uploads.is_empty());
        assert_eq!(runtime.pending_upload_bytes, 0);
    }

    #[test]
    fn multipart_part_replacement_updates_accounting_and_enforces_global_limit() {
        let mut runtime = Runtime::default();
        runtime.uploads.insert(
            "upload".into(),
            MultipartUpload {
                key: "object".into(),
                content_type: None,
                created_at: Instant::now(),
                size_bytes: 0,
                completing: false,
                parts: HashMap::new(),
            },
        );
        let first_etag = store_upload_part(&mut runtime, "upload", "object", 1, b"first".to_vec())
            .expect("first part should be stored");
        assert_eq!(runtime.pending_upload_bytes, 5);
        let replacement_etag =
            store_upload_part(&mut runtime, "upload", "object", 1, b"next".to_vec())
                .expect("replacement should be stored");
        assert_ne!(first_etag, replacement_etag);
        assert_eq!(runtime.pending_upload_bytes, 4);
        assert_eq!(runtime.uploads["upload"].size_bytes, 4);

        runtime.pending_upload_bytes = MAX_PENDING_UPLOAD_BYTES;
        assert_eq!(
            store_upload_part(&mut runtime, "upload", "object", 2, vec![1])
                .unwrap_err()
                .0,
            413
        );
        assert_eq!(runtime.pending_upload_bytes, MAX_PENDING_UPLOAD_BYTES);
        assert_eq!(runtime.uploads["upload"].parts.len(), 1);

        runtime.pending_upload_bytes = MAX_OBJECT_BYTES;
        runtime.uploads.get_mut("upload").unwrap().size_bytes = MAX_OBJECT_BYTES;
        assert_eq!(
            store_upload_part(&mut runtime, "upload", "object", 2, vec![1])
                .unwrap_err()
                .2,
            "Multipart object exceeds the 16 MiB limit"
        );
        assert_eq!(runtime.pending_upload_bytes, MAX_OBJECT_BYTES);
    }

    #[test]
    fn sigv4_validates_body_hash_and_timestamp_freshness() {
        use chrono::{TimeZone, Utc};
        use sha2::{Digest, Sha256};

        let access_key = "AKIAIOSFODNN7EXAMPLE";
        let secret_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";
        let date_stamp = "20261116";
        let amz_date = "20261116T010000Z";
        let body = b"hello-s3".to_vec();
        let payload_hash = super::hex_encode(&Sha256::digest(&body));
        let canonical = format!(
            "PUT\n/rocksoul/test.txt\n\nhost:127.0.0.1\nx-amz-content-sha256:{payload_hash}\nx-amz-date:{amz_date}\n\nhost;x-amz-content-sha256;x-amz-date\n{payload_hash}"
        );
        let scope = format!("{date_stamp}/us-east-1/s3/aws4_request");
        let sts = format!(
            "AWS4-HMAC-SHA256\n{amz_date}\n{scope}\n{}",
            super::hex_encode(&Sha256::digest(canonical.as_bytes()))
        );
        let k_date = super::hmac_sha256(
            format!("AWS4{secret_key}").as_bytes(),
            date_stamp.as_bytes(),
        );
        let k_reg = super::hmac_sha256(&k_date, b"us-east-1");
        let k_svc = super::hmac_sha256(&k_reg, b"s3");
        let k_sign = super::hmac_sha256(&k_svc, b"aws4_request");
        let sig = super::hex_encode(&super::hmac_sha256(&k_sign, sts.as_bytes()));
        let auth = format!(
            "AWS4-HMAC-SHA256 Credential={access_key}/{scope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature={sig}"
        );
        let mut headers = std::collections::HashMap::new();
        headers.insert("host".into(), "127.0.0.1".into());
        headers.insert("x-amz-content-sha256".into(), payload_hash);
        headers.insert("x-amz-date".into(), amz_date.into());
        headers.insert("authorization".into(), auth);
        let req = Request {
            method: "PUT".into(),
            path: "/rocksoul/test.txt".into(),
            headers,
            body,
        };
        let now = Utc
            .with_ymd_and_hms(2026, 11, 16, 1, 0, 0)
            .single()
            .expect("test timestamp should be valid");
        assert!(super::authorized_at(&req, access_key, secret_key, now));
        assert!(!super::authorized_at(&req, access_key, "wrong-secret", now));

        let mut tampered_body = Request {
            body: b"tampered".to_vec(),
            ..req
        };
        assert!(!super::authorized_at(
            &tampered_body,
            access_key,
            secret_key,
            now
        ));
        tampered_body.body = b"hello-s3".to_vec();
        assert!(!super::authorized_at(
            &tampered_body,
            access_key,
            secret_key,
            now + chrono::Duration::hours(1)
        ));
    }
}
