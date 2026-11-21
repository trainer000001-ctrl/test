# Security Notes

- The desktop app is local-first and does not send project contents to a ROCKSOUL cloud service.
- AI CLI execution is outside this release; agent process execution is not compiled into the application command surface.
- Git uses fixed inspection and write-operation allowlists and never accepts arbitrary command strings. Write operations require explicit UI confirmation, validate branch names, reject dirty-worktree operations where unsafe, and report conflicts without force-resetting user work.
- Repository registration canonicalizes the Git root. Stored repository paths must remain local and accessible.
- SQLite connections enable foreign-key enforcement. Project deletion is transactional and preserves linked issues and repositories while removing milestones.
- The browser preview is not a native security boundary and stores workflow state in localStorage.
- The application does not expose a general arbitrary-shell endpoint.
- Tauri capabilities are minimal; add permissions only when a concrete local feature requires them.
- Do not expose the local SQLite database or app-data directory through an unauthenticated network service.
- The optional S3-compatible gateway listens on `127.0.0.1` with an OS-assigned port and per-session credentials. Do not expose it through a proxy or bind it to a non-loopback interface.
- The gateway accepts the session bearer credential or AWS Signature Version 4. SigV4 validation checks the actual SHA-256 request body and rejects timestamps more than 15 minutes from the current time. Object keys are validated before Drive calls.
- Objects are limited to 16 MiB. Multipart uploads are capped at two active uploads and 32 MiB of retained part data, expire after 30 minutes, and enforce the 10,000-part and 5 MiB non-final-part limits.
- This personal-use gateway is not a hardened multi-tenant S3 implementation and does not provide per-key ACLs or object versioning.

This document describes intended boundaries; it is not a security certification or substitute for a release security review.
