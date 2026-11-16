# Security notes and current threat boundary

## Data flow

Plaintext exists in the sender's input and active browser memory, then is encrypted with Web Crypto AES-256-GCM before network transmission. AES-GCM authenticates the room ID, message ID, sender label, and timestamp as additional data. The server sees the room ID, display name, timestamps, message IDs, IVs, ciphertext lengths, IP/connection metadata, and timing. It stores encrypted message envelopes and never receives the AES key through HTTP or WebSocket. The invite key is in the URL fragment, which browsers do not include in HTTP requests or the Referer header; the app removes it from the address bar after import.

## Implemented controls

- 256-bit random AES-GCM room keys and fresh 96-bit random IVs per message using Web Crypto.
- Authenticated additional data binds ciphertext to room, message ID, sender label, and the displayed timestamp.
- Non-exportable browser key in IndexedDB; pending message outbox contains ciphertext only.
- HTTPS/WSS deployment expectation, configured WebSocket Origin allowlist, payload validation/size limits, per-IP connection caps, room/IP short-window rate limit, heartbeat, MongoDB TTL and unique indexes, Redis-backed cross-instance pub/sub, and graceful shutdown.
- Referrer policy and common browser response headers in Vercel config.
- Logs omit message payloads, invite secrets, and keys. Client error logs avoid raw URLs and message contents.

## Known limitations before real users

- No authenticated accounts or device identities. Anybody holding an invite has equal room access and can impersonate a display name.
- Shared room key has no key rotation, forward secrecy, post-compromise recovery, device revocation, or independent key verification. The homemade X3DH/Double Ratchet files are currently experimental and unused.
- Local IndexedDB and localStorage are accessible to same-origin JavaScript. A successful XSS attack, malicious browser extension, compromised device, or stolen unlocked profile can read messages or use the key. Browser-only E2EE cannot defend against a compromised endpoint.
- The backend trusts the room UUID as the history capability. UUIDs are high entropy, but there is not yet an authenticated membership/authorization model.
- Rate limits are per IP and room, but do not provide distributed denial-of-service protection. Add a managed edge/WAF and operational limits before public launch.
- MongoDB receives metadata and ciphertext. Database/Redis compromise does not reveal plaintext, but can expose communication metadata, delete/withhold messages, or disrupt delivery.
- The local development fallback is memory-only and does not provide multi-instance delivery. Production refuses to start without MongoDB and Redis.
- The countdown is enforced by the client UI; document retention is currently governed by the backend's configurable seven-day TTL. It is not a guarantee that all copies disappear at the visible countdown.

## Release blockers for high-risk E2EE

Adopt a maintained, independently reviewed browser-compatible protocol implementation; add authenticated identity/key verification and rotation; perform an external cryptography review; threat-model XSS and recovery; test nonce/message limits, replay/reordering, malformed frames, multi-device recovery, database/Redis outages, and rate-limit abuse; then document exact guarantees and residual risks. Never describe the current shared-key system as Signal-compatible or forward-secret.
