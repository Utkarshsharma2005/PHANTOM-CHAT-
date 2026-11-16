# Engineering scorecard

| Area | Current status | Evidence / remaining work |
|---|---|---|
| Frontend | Implemented foundation | Next.js App Router shell, Inter typography, restrained responsive landing/chat UI, real room history, loaded-message search, and truthful empty/member states; browser E2E and accessibility review remain. The landing chat is an explicitly illustrative preview. |
| Realtime | Implemented foundation | WebSocket relay, reconnect, heartbeat, local encrypted outbox, Mongo history; deployment smoke test and load test remain. |
| Persistence | Implemented | MongoDB encrypted envelopes with TTL and unique indexes; production Atlas configuration and outage tests remain. |
| Horizontal fan-out | Implemented foundation | Redis pub/sub between instances; Redis outage behavior and multi-instance deployment test remain. |
| Encryption | Limited | Browser AES-GCM shared-room key; no identity, key verification, forward secrecy, or ratchet. |
| Rate limiting | Basic | Redis-backed distributed rate limiting with a bounded local development fallback; authenticated user limits and a separately configured WAF/API gateway remain. |
| Testing | In progress | Vitest crypto tests and Node WebSocket integration tests; reconnect, Mongo/Redis integration, load, browser E2E, and failure tests remain. |
| CI/CD | Implemented foundation | GitHub Actions lint/build/test gate; Vercel and Render production secrets/hooks must be configured. |
| Observability | Basic | Health endpoint and minimal structured event logs; metrics/tracing/alerts absent. |
| Operations | In progress | Render/Vercel config, CSP nonce, static asset caching, and deployment docs; Atlas/Redis production setup, backups, alerting, dedicated API gateway/WAF configuration, and scale tests remain. |
