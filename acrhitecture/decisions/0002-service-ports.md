# ADR-0002: Service port assignment

Status: accepted (2026-08-31)

Frontend listens and is published on TCP `30002`. Its server-side auth and transcriber-gateway clients use auth-gateway port `30001`. The browser never connects to internal transcriber port `30000`; PostgreSQL remains on `55432`.
