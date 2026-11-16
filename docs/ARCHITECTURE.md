# Phantom Chat architecture

## Current deployable slice

```text
Browser (Next.js app on Vercel)
  ├─ Web Crypto AES-256-GCM; key is supplied by invite URL fragment
  ├─ IndexedDB: non-exportable CryptoKey + active room metadata
  ├─ localStorage: encrypted unsent-message outbox
  └─ HTTPS / WSS
        ↓
Render Node service (Express + ws)
  ├─ MongoDB: encrypted message envelopes, unique room/message ID, expiry index
  ├─ Redis: cross-instance pub/sub, short-lived ciphertext history cache, and short-window throttling
  └─ Health endpoint, origin checks, payload limits, heartbeat, graceful shutdown
```

The backend is a stateless relay at the application layer. It stores message ciphertext and routing metadata, never decrypted text or room keys. A unique `(roomId, messageId)` index makes persistence idempotent. MongoDB TTL indexes remove expired room and message documents. Redis pub/sub distributes a room message to sockets connected to other Render instances; a 15-second cache holds only ciphertext history and is invalidated on sends. Redis is not the source of durable history.

## Realtime and recovery

- Clients fetch the latest 100 room envelopes over HTTPS, decrypt locally, then connect to `/ws`. Scrolling to the top fetches older pages using a stable `(createdAt, messageId)` cursor so the UI can reach all retained room history.
- New envelopes are AES-GCM encrypted before the WebSocket send. The room ID, message ID, and sender label are authenticated as additional data.
- The sender keeps encrypted outbound envelopes locally until the backend acknowledges them. Retry uses the same ID, so duplicate submissions do not create duplicate stored messages.
- Reconnect uses capped exponential backoff with jitter. The backend pings connections and closes stale peers. A deploy or network outage causes reconnect and history resynchronization.
- The browser session key is stored as a non-exportable `CryptoKey` in IndexedDB. Browser storage can still be read or used by same-origin script, browser extensions, malware, or anyone with access to the unlocked profile. Clearing browser site data removes this recovery state.

## Scaling and availability

The service keeps live socket membership in process memory only. MongoDB and Redis are shared dependencies, so instances can be replaced or horizontally scaled without losing messages or room fan-out. Render's load balancer can place a reconnect on any instance; Redis pub/sub and the database make that safe. The first Render blueprint uses one service instance to keep the initial deployment small. Increase its compute plan for vertical scaling; manually increase `numInstances` for horizontal scaling, or configure CPU/memory autoscaling on an eligible Render workspace. Use a paid/persistent Redis plan for production. A free/ephemeral cache is not suitable for dependable cross-instance fan-out.

MongoDB Atlas and Render should be placed in nearby regions. Restrict Atlas network access to the backend service's egress strategy, use a least-privilege database user, and enable backups appropriate to the retention policy. Vercel hosts the Next.js frontend; `NEXT_PUBLIC_API_URL` points to the Render URL. The current config adds a per-response CSP nonce and immutable caching for Next static assets. No service should persist plaintext messages.

## Intentionally not claimed

This release does not have user accounts, authenticated device identities, group membership control, a Signal-compatible handshake, a Double Ratchet, key verification, or forward secrecy. The invite link is a bearer secret: anyone with it can join and decrypt the room. A sender name is user-controlled metadata. The in-repository X3DH/ratchet draft is not connected to this data path and must not be treated as production security code. Do not use this release for high-risk communications until an established, independently reviewed protocol implementation replaces the shared room-key design.
