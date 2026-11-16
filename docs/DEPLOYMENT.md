# Deployment and CI/CD

## Local development

1. Copy `.env.example` to `.env` and set `NEXT_PUBLIC_API_URL=http://localhost:4000`.
2. Start MongoDB and Redis locally, then set `MONGODB_URI` and `REDIS_URL`. The server can run without them in development, but in-memory messages and rate limits are process-local and are lost on restart.
3. Run `npm run dev`. It starts the Next.js frontend and WebSocket/API server together. MongoDB and Redis are optional locally; without them, room history is held in memory and disappears when the server restarts.
4. Run `npm run lint`, `npm run build`, and `npm test` before submitting changes.

The frontend uses `NEXT_PUBLIC_API_URL`; it derives `ws://` or `wss://` for the socket by changing the URL scheme. Set `NEXT_PUBLIC_WS_URL` only when the WebSocket endpoint has a different host. Next.js generates a per-response CSP nonce in `proxy.ts`; local development explicitly allows the localhost HTTP and WebSocket API origins, while production allows the configured API/socket origins. Verify both origins in the deployed `connect-src` policy when diagnosing blocked connections.

## Vercel frontend

- Import the repository as a Next.js project; Vercel detects the framework and uses `npm run build`.
- Set `NEXT_PUBLIC_API_URL` to the public Render backend URL (for example `https://phantom-chat-api.onrender.com`).
- In GitHub Actions, configure `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` repository secrets. The workflow deploys production only after lint, build, and tests pass on `main`.
- Disable independent Vercel Git production deployments if GitHub Actions is the required release gate.

## Render backend and Redis

- Create a Render Blueprint from `render.yaml`. Its `MONGODB_URI` and `CORS_ORIGINS` values are intentionally prompted as secrets/configuration.
- Create a MongoDB Atlas database and a least-privilege user. Set `MONGODB_URI` to the Atlas connection URI. Configure Atlas network access so only the Render service can reach it.
- The Blueprint creates Render Key Value in the same region and passes its private `connectionString` as `REDIS_URL`.
- Set `CORS_ORIGINS` to the exact Vercel production origin(s), comma separated. Add preview origins only when needed.
- Create a Render deploy hook and set it as the GitHub `RENDER_DEPLOY_HOOK` secret. The backend Blueprint disables automatic deploys so production deploys run only after CI succeeds.
- The service listens on Render's injected `PORT`, exposes `/healthz`, supports WSS upgrades on the same port, and requires MongoDB and Redis in production.

## Scaling and operations

Start with one backend instance and a Redis plan sized for active connections/cache use. Monitor Render CPU, memory, open connections, and Redis connection/memory metrics. Increase the service compute plan when one instance approaches resource limits. Add instances manually first; Redis pub/sub carries room messages across instances and MongoDB carries durable history. Render autoscaling can be enabled on an eligible workspace with a minimum of one and a measured CPU/memory target. Load test before selecting limits; do not infer capacity from local development.

Scale MongoDB independently: inspect query latency and index use, set connection-pool limits, and review TTL deletion lag. Scale Redis memory and connection capacity to match active backend instances. Redis is used for coordination and throttling, not durable message history.

WebSocket clients reconnect with exponential backoff because deployments and instance replacement close long-lived connections. History uses stable cursor pagination; the browser stores the pending ciphertext outbox until acknowledgements arrive. Keep health checks independent of user data and never log message bodies, invite URLs, crypto keys, or full WebSocket payloads.
