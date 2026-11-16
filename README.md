# Phantom Chat

Phantom Chat is a private, browser-encrypted room chat with a Next.js/React frontend and a Node.js WebSocket relay. The frontend is intended for Vercel; the backend runs as a persistent Render web service, with MongoDB for encrypted message history and Redis for cross-instance fan-out, short-lived history cache, and distributed rate limits.

The current interface supports creating or joining one invite-only room, sending encrypted text messages, restoring history, searching messages already loaded in the room, copying the invite, and reconnecting with an encrypted local outbox. The chat view shows only the current room and current participant data. The landing-page chat is a labeled illustrative preview; voice/video calls, reactions, file sharing, verified identities, and multi-room navigation are not implemented.

## Development

See [Deployment](docs/DEPLOYMENT.md) for local setup, required environment variables, and deployment steps. Next.js serves the browser app on port 5173 while the Express API and WebSocket relay use port 4000.

```sh
npm ci --legacy-peer-deps
npm run dev
```

Run checks with `npm run lint`, `npm run build`, and `npm test`.

## Architecture and security

- [Architecture overview](docs/ARCHITECTURE.md)
- [Security boundary and known limitations](docs/SECURITY.md)
- [Cryptography notes](docs/CRYPTOGRAPHY.md)

The current encryption design uses one AES-GCM room key shared through a bearer invite link. It encrypts message contents in the browser, but does not yet provide authenticated identities, forward secrecy, or Signal Protocol compatibility. See the security notes before using it with sensitive conversations.
