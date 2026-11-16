# PHANTOM CHAT 2.0 — Engineering Baseline Audit (Phase 0)

## Executive Summary
This repository began as a client-only prototype. A first realtime and deployment foundation has since been added. This original audit is retained as a historical baseline; see `docs/ARCHITECTURE.md` and `docs/SECURITY.md` for the current implementation and limitations.

---

## 1. Current Architecture & Tech Stack

### Frontend
- **Framework**: React 19.2.0 + TypeScript + Vite 7.2.4
- **Styling**: Tailwind CSS 3.4.18 + Radix UI Primitives + Framer Motion
- **Icons & UI Utilities**: Lucide React, Sonner (Toasts), Vaul, Class Variance Authority (`cva`)
- **State & Routing**: React `useState`/`useEffect`, sessionStorage, `react-router-dom` 7.10.1, `@tanstack/react-query` 5.90.12

### Backend & Infrastructure (Current State)
- **Backend Server**: **NONE** (Pure client-side single-page app)
- **Database**: **NONE** (No PostgreSQL, Prisma, Drizzle, or ORM initialized)
- **Cache & Ephemeral State**: **NONE** (No Redis instance or client)
- **Real-Time Transport**: **NONE** (Messages stored only in local React state)
- **Containerization**: **NONE** (No Dockerfile or docker-compose.yml)
- **CI/CD**: **NONE** (No GitHub Actions pipelines)

---

## 2. Capabilities & Existing Functionality

### What Works
1. **Client-Side UI**: Home screen, room creation options, nickname input, duration selector, and secure chat room interface.
2. **Web Crypto API Primitives**: `AES-256-GCM` key generation, export, import, encryption, and decryption functions in `src/lib/crypto.ts`.
3. **Screen Security Hook**: `useScreenSecurity` tracks window blur/focus events to display a screenshot warning modal.
4. **Countdown Timer Hook**: `useCountdown` tracks session duration and triggers expired UI state upon expiration.
5. **Local Message Encryption**: Sending a message encrypts text using Web Crypto API and appends it to local component state.

---

## 3. Critical Gaps & Technical Debt

### A. Missing Backend & Real-Time Messaging
- **No Real-Time Relay**: Messages sent by one user do NOT reach another user because there is no WebSocket server or signaling mechanism.
- **No Persistence**: Refreshing the page destroys all active chat messages and session key state.

### B. Security Weaknesses
1. **Encryption Key in URL Query String**: The raw 256-bit symmetric key is passed as a URL query parameter (`?key=...`). URL parameters can leak in browser history, HTTP Referer headers, or server access logs.
2. **Lack of Identity & Authenticated Key Exchange**: Currently lacks asymmetric Curve25519 (X25519) identity keys and X3DH (Extended Triple Diffie-Hellman) key agreement. Both clients currently rely on static symmetric keys.
3. **No Double Ratchet State Machine**: Lacks continuous KDF and DH ratcheting (HKDF-SHA256 & HMAC-SHA256) for forward secrecy and post-compromise security.
4. **No Rate Limiting or Anti-Abuse**: No protection against message spamming or brute-force attempts.

### C. Testing Gaps
- **0 Unit Tests**: No tests for crypto functions, countdown hooks, or security hooks.
- **0 Integration Tests**: No tests for room lifecycle or key derivation.
- **0 E2E Tests**: No Playwright or Cypress tests.

### D. Infrastructure & Observability Gaps
- No environment validation.
- No structured logging, metrics (Prometheus/Grafana), or tracing (OpenTelemetry).
- No Docker or Nginx reverse proxy configuration.

---

## 4. Phase-by-Phase Target Roadmap

| Phase | Description | Status |
|---|---|---|
| **Phase 0** | Repository Audit & Engineering Baseline | **COMPLETE** |
| **Phase 1** | Architecture Foundation & Node.js/TypeScript Backend | Planned |
| **Phase 2** | Authentication & Session Management | Planned |
| **Phase 3** | Conversation System & PostgreSQL Database Schema | Planned |
| **Phase 4** | WebSocket Protocol & Heartbeat Engine | Planned |
| **Phase 5** | Real-Time Encrypted Messaging & Idempotency | Planned |
| **Phase 6** | Redis Integration (Presence & Ephemeral State) | Planned |
| **Phase 7** | Robust Cryptographic Protocol (X25519/Signal-style DH) | Planned |
| **Phase 8** | Offline Synchronization & Message Queueing | Planned |
| **Phase 9** | Multi-Device Support & Device Revocation | Planned |
| **Phase 10** | Encrypted File Sharing & Blob Storage | Planned |
| **Phase 11** | Comprehensive Testing Pyramid (Unit, Integration, E2E) | Planned |
| **Phase 12** | Performance Engineering & Load Benchmarking | Planned |
| **Phase 13** | Observability (Structured Logging, Prometheus, Grafana) | Planned |
| **Phase 14** | Failure Engineering & Resilience Verification | Planned |
| **Phase 15** | Chaos Testing & Network Interruption Handling | Planned |
| **Phase 16** | Production Hardening, Docker & Nginx Deployment | Planned |
| **Phase 17** | Final Engineering Review & Evidence Verification | Planned |
