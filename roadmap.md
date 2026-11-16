# PHANTOM CHAT 2.0
## Engineering Master Prompt
## Privacy-First, End-to-End Encrypted, Distributed Real-Time Messaging Platform

You are acting as a senior/principal software engineering team responsible for transforming an existing project called "Phantom Chat" into a production-grade, security-conscious, highly tested real-time messaging system.

Do NOT treat this as a simple CRUD/chat application.

The goal is to build a technically deep portfolio project demonstrating:

- Full-stack engineering
- Backend engineering
- Distributed systems
- Real-time systems
- Cryptography
- Security engineering
- Database engineering
- Performance engineering
- Testing
- DevOps
- Observability
- Reliability engineering
- System design
- Failure recovery
- Engineering documentation
- Evidence-driven optimization

The final repository should be something an experienced software engineer can inspect and understand.

The project must be built incrementally, with measurable engineering evidence at every major stage.

--------------------------------------------------
# 0. CORE ENGINEERING PRINCIPLES
--------------------------------------------------

Follow these principles throughout the entire project.

1. Correctness before optimization.
2. Security before convenience.
3. Explicit architecture over accidental architecture.
4. Measure before optimizing.
5. Small changes over giant rewrites.
6. Prefer simple solutions until complexity is justified.
7. Every important architectural decision must be documented.
8. Every security-sensitive feature must have tests.
9. Every performance claim must be backed by a benchmark.
10. Every reliability claim must be backed by a failure/recovery test.
11. Never invent benchmark numbers.
12. Never claim security properties that have not actually been implemented and tested.
13. Never claim production readiness without evidence.
14. Never silently introduce breaking changes.
15. Preserve working functionality while improving the system.
16. Use type safety wherever practical.
17. Prefer explicit contracts between components.
18. Keep security boundaries obvious.
19. Keep state ownership explicit.
20. Make failures observable.
21. Make important operations idempotent.
22. Design for graceful degradation.
23. Avoid premature microservices.
24. Avoid unnecessary dependencies.
25. Every dependency must have a reason.

The project should evolve through controlled iterations rather than being generated as one enormous implementation.

--------------------------------------------------
# 1. DEVELOPMENT METHODOLOGY
--------------------------------------------------

Use an iterative engineering loop for every phase:

OBSERVE
→ UNDERSTAND
→ PLAN
→ IMPLEMENT
→ TEST
→ MEASURE
→ REVIEW
→ DOCUMENT
→ REFACTOR
→ REPEAT

For every significant feature:

1. Inspect the existing code.
2. Understand current behavior.
3. Identify constraints.
4. Write or update the design.
5. Define acceptance criteria.
6. Implement the smallest useful increment.
7. Run tests.
8. Run static analysis.
9. Run security checks where relevant.
10. Measure performance where relevant.
11. Review the diff.
12. Update documentation.
13. Only then move to the next increment.

Do not blindly rewrite the repository.

--------------------------------------------------
# 2. ENGINEERING WORKFLOW
--------------------------------------------------

Use a professional workflow inspired by:

- Trunk-based development
- Continuous integration
- Continuous delivery
- Test-driven development where useful
- Behavior-driven acceptance criteria where useful
- Code review
- ADR-driven architecture
- Threat modeling
- Observability-driven development
- Performance profiling
- Chaos/failure testing
- Incremental refactoring
- Evidence-driven optimization

Do not apply these mechanically.

Use engineering judgment.

--------------------------------------------------
# 3. FIRST ACTION: REPOSITORY AUDIT
--------------------------------------------------

Before changing code, perform a complete repository audit.

Inspect:

- package manifests
- lockfiles
- source tree
- frontend
- backend
- database
- WebSocket implementation
- authentication
- encryption
- Docker configuration
- environment configuration
- tests
- CI/CD
- documentation
- existing schemas
- existing APIs
- existing migrations
- existing dependencies
- existing security mechanisms

Determine:

A. What already works?
B. What is partially implemented?
C. What is broken?
D. What is insecure?
E. What is technically sound?
F. What should be preserved?
G. What should be refactored?
H. What should be replaced?
I. What is missing?
J. What claims in the existing README are not supported by implementation?

Do NOT start major implementation before this audit.

Create:

docs/ENGINEERING_BASELINE.md

Include:

- current architecture
- current stack
- current capabilities
- known bugs
- security weaknesses
- testing gaps
- performance gaps
- architectural risks
- technical debt
- recommended implementation order

--------------------------------------------------
# 4. ESTABLISH THE TARGET ARCHITECTURE
--------------------------------------------------

Target architecture:

                    ┌─────────────────────┐
                    │     Web Client      │
                    │ React + TypeScript  │
                    └──────────┬──────────┘
                               │
                         HTTPS / WSS
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Nginx          │
                    │ Reverse Proxy       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Node.js Backend   │
                    │   API + WebSocket   │
                    └──────┬───────┬──────┘
                           │       │
                  ┌────────┘       └────────┐
                  ▼                         ▼
             PostgreSQL                   Redis
                  │                         │
                  │                         │
                  ▼                         ▼
          Durable State              Ephemeral State
          & Metadata                 Pub/Sub/Presence
          
Object/file storage may be introduced later.

IMPORTANT:

Do not immediately split the backend into many microservices.

Start with a modular monolith.

Only introduce service separation if profiling, scaling requirements, or clear architectural boundaries justify it.

--------------------------------------------------
# 5. TARGET TECHNOLOGY
--------------------------------------------------

Frontend:

- React
- TypeScript
- Vite
- modern component architecture
- accessible UI
- WebSocket client
- secure client-side cryptography
- local encrypted storage where appropriate

Backend:

- Node.js
- TypeScript
- Express or Fastify
- WebSocket implementation
- PostgreSQL
- Redis

Infrastructure:

- Docker
- Docker Compose
- Nginx
- GitHub Actions
- Linux-compatible deployment

Testing:

- Vitest/Jest
- integration testing
- API testing
- WebSocket testing
- E2E testing
- load testing
- security testing
- failure/recovery testing

Observability:

- structured logging
- metrics
- OpenTelemetry where practical
- Prometheus
- Grafana

Use existing project technologies when they are sound.

Do not rewrite technology merely for novelty.

--------------------------------------------------
# 6. DOMAIN MODEL
--------------------------------------------------

Design explicit domain entities.

At minimum consider:

users
devices
sessions
conversations
conversation_members
messages
message_receipts
encryption_metadata
attachments
presence
audit_logs

Potential future entities:

message_reactions
message_edits
message_deletions
blocked_users
reports
notification_preferences

Every entity must have:

- clear ownership
- validation rules
- lifecycle
- indexes
- relationships
- security implications

Create:

docs/DATABASE.md

Document:

- ER diagram
- normalization decisions
- indexes
- constraints
- foreign keys
- transaction boundaries
- query patterns
- pagination strategy
- retention strategy

--------------------------------------------------
# 7. MESSAGE MODEL
--------------------------------------------------

Design messages around reliable delivery.

A message should have an immutable unique identifier.

Consider fields such as:

message_id
conversation_id
sender_device_id
ciphertext
created_at
client_sequence
server_sequence
message_type
encryption_version
status

Do not store plaintext message content on the server.

The server should primarily operate on encrypted payloads and metadata required for routing/delivery.

Implement idempotency.

Duplicate message submission must not create duplicate logical messages.

--------------------------------------------------
# 8. CRYPTOGRAPHY
--------------------------------------------------

Treat cryptography as a serious security subsystem.

DO NOT invent cryptographic algorithms.

Use well-reviewed cryptographic libraries.

Do not implement cryptographic primitives manually.

Investigate and document an appropriate protocol design using established primitives such as:

- X25519
- Ed25519
- authenticated encryption
- secure random generation
- key derivation

Potential goals:

- identity keys
- session establishment
- per-session keys
- forward secrecy
- message authentication
- replay protection
- key rotation
- device identity
- key verification

Create:

docs/CRYPTOGRAPHY.md

Document:

- threat model
- key hierarchy
- key lifecycle
- session establishment
- encryption/decryption flow
- nonce handling
- replay protection
- rotation
- recovery limitations
- compromise scenarios

IMPORTANT:

Do not claim Signal Protocol compatibility unless an actual compatible implementation is used and verified.

Do not claim "military grade encryption" or similar marketing language.

Be technically precise.

--------------------------------------------------
# 9. SECURITY THREAT MODEL
--------------------------------------------------

Create:

docs/THREAT_MODEL.md

Identify:

- passive network attacker
- active network attacker
- compromised account
- stolen device
- malicious client
- malicious server administrator
- database compromise
- Redis compromise
- replay attacker
- brute-force attacker
- malicious file upload
- WebSocket abuse
- denial-of-service
- credential theft

For each threat:

- attack
- impact
- mitigation
- residual risk
- test

Use STRIDE or another recognized threat-modeling methodology where appropriate.

--------------------------------------------------
# 10. AUTHENTICATION
--------------------------------------------------

Implement secure authentication.

Requirements may include:

- password hashing with an appropriate modern password hashing algorithm
- secure session handling
- refresh/access token strategy if tokens are used
- session revocation
- device/session management
- brute-force protection
- rate limiting
- secure cookies where applicable
- CSRF protection where applicable
- input validation

Never store plaintext passwords.

Never place secrets in source control.

--------------------------------------------------
# 11. WEBSOCKET ARCHITECTURE
--------------------------------------------------

Build the WebSocket layer as a reliable protocol rather than simply opening sockets.

Implement:

- connection authentication
- heartbeat/ping-pong
- disconnect detection
- reconnect
- exponential backoff
- connection limits
- rate limiting
- message acknowledgement
- ordering
- duplicate detection
- idempotency
- backpressure
- graceful shutdown

Define a versioned WebSocket protocol.

Create:

docs/WEBSOCKET_PROTOCOL.md

Document:

connection lifecycle
authentication
message types
acknowledgements
errors
reconnect behavior
ordering
versioning
heartbeat
rate limits

Use explicit schemas for messages.

--------------------------------------------------
# 12. MESSAGE DELIVERY SEMANTICS
--------------------------------------------------

Define exactly what the system guarantees.

For example:

- at-most-once
- at-least-once
- effectively-once at application level through idempotency

Do not casually claim "exactly once" delivery.

Implement:

Client
→ message ID
→ server acknowledgement
→ durable persistence
→ recipient delivery
→ recipient acknowledgement

Handle:

- client retry
- duplicate submission
- server restart
- network interruption
- recipient offline
- reconnect

Document the actual guarantees.

--------------------------------------------------
# 13. OFFLINE-FIRST CAPABILITIES
--------------------------------------------------

Build a synchronization engine.

When offline:

message
→ local encrypted queue
→ pending state

When online:

pending message
→ server
→ acknowledgement
→ synchronization
→ confirmed state

Handle:

- retries
- duplicate prevention
- ordering
- failed messages
- reconnect
- partial synchronization

Define a sync protocol.

--------------------------------------------------
# 14. MULTI-DEVICE SUPPORT
--------------------------------------------------

Allow a user to have multiple devices.

Model:

User
 ├── Device A
 ├── Device B
 └── Device C

Each device should have:

- identity
- authentication session
- cryptographic identity
- revocation state
- last seen
- metadata

Implement device revocation.

--------------------------------------------------
# 15. PRESENCE
--------------------------------------------------

Implement:

- online
- offline
- last seen
- typing
- connection state

Presence is ephemeral.

Do not unnecessarily persist high-frequency ephemeral state in PostgreSQL.

Use Redis where appropriate.

--------------------------------------------------
# 16. REDIS
--------------------------------------------------

Use Redis for appropriate ephemeral workloads.

Potential uses:

- presence
- WebSocket pub/sub
- rate limiting
- temporary session data
- distributed coordination where justified
- caching

Do not use Redis as the primary durable database.

Document why each Redis use exists.

--------------------------------------------------
# 17. DATABASE ENGINEERING
--------------------------------------------------

Optimize PostgreSQL based on evidence.

Implement:

- proper indexes
- foreign keys
- constraints
- transactions
- connection pooling
- cursor/keyset pagination where appropriate
- query optimization
- prepared statements/ORM safety
- migration management

Measure slow queries.

Do not add indexes blindly.

For important queries record:

- query plan
- expected access pattern
- index justification

--------------------------------------------------
# 18. ENCRYPTED FILE SHARING
--------------------------------------------------

Add optional secure file sharing.

Architecture:

File
→ client-side encryption
→ encrypted blob
→ object storage
→ recipient download
→ client-side decryption

Implement:

- file size limits
- MIME validation
- extension validation
- content hashing
- access control
- expiring access
- upload cancellation
- resumable upload if justified

Treat file uploads as hostile input.

--------------------------------------------------
# 19. TESTING STRATEGY
--------------------------------------------------

Build a complete testing pyramid.

                 E2E
                /   \
          Integration
             /       \
           Unit      Contract

Additionally:

Security
Load
Stress
Soak
Chaos/Failure

Unit tests:

- encryption helpers
- validation
- message state machine
- protocol parsing
- business logic

Integration:

- PostgreSQL
- Redis
- WebSockets
- authentication
- message persistence

E2E:

- registration
- login
- conversation creation
- message send
- message receive
- offline delivery
- reconnect
- multi-device

Security:

- malformed input
- authentication bypass
- authorization bypass
- replay
- rate-limit bypass
- injection
- WebSocket abuse

--------------------------------------------------
# 20. PROPERTY-BASED TESTING
--------------------------------------------------

Where appropriate, introduce property-based tests.

Examples:

Encryption property:

decrypt(encrypt(message)) == message

Message ID property:

duplicate(message_id) does not create duplicate logical messages

Ordering property:

accepted messages preserve defined ordering guarantees

Synchronization property:

eventually synchronized clients converge to the defined consistent state

Do not force property-based testing where it adds no value.

--------------------------------------------------
# 21. LOAD TESTING
--------------------------------------------------

Build a dedicated load-testing environment.

Test:

- concurrent WebSocket connections
- message throughput
- connection establishment
- reconnect storms
- database throughput
- Redis throughput

Record:

connections
messages/sec
p50
p95
p99
CPU
memory
DB latency
Redis latency
error rate

Never invent numbers.

Store benchmark results in:

benchmarks/

Example:

benchmarks/
├── websocket/
├── messaging/
├── database/
├── redis/
└── reconnect/

--------------------------------------------------
# 22. PERFORMANCE ENGINEERING
--------------------------------------------------

Use:

MEASURE
→ PROFILE
→ IDENTIFY BOTTLENECK
→ CHANGE ONE THING
→ BENCHMARK
→ COMPARE
→ KEEP/REVERT

Do not optimize based on intuition alone.

Potential bottlenecks:

- serialization
- database queries
- connection management
- Redis operations
- event loop blocking
- excessive allocations
- network overhead
- inefficient React rendering

Use profiling tools where appropriate.

--------------------------------------------------
# 23. FAILURE ENGINEERING
--------------------------------------------------

Test failure deliberately.

Simulate:

- PostgreSQL unavailable
- Redis unavailable
- network interruption
- WebSocket disconnect
- backend restart
- duplicate message
- delayed message
- malformed message
- connection spike
- database timeout

Document:

failure
→ detection
→ recovery
→ user impact
→ remaining risk

Create:

docs/FAILURE_MODES.md

--------------------------------------------------
# 24. CHAOS TESTING
--------------------------------------------------

Introduce controlled failure testing only after the basic reliability layer works.

Examples:

- randomly terminate WebSocket connections
- restart backend during active sessions
- introduce artificial latency
- temporarily stop Redis
- temporarily stop PostgreSQL
- simulate network failures

Measure whether the system:

- reconnects
- recovers
- avoids corruption
- avoids duplicate messages
- surfaces errors
- preserves user-visible consistency

Never perform destructive chaos tests against production.

--------------------------------------------------
# 25. OBSERVABILITY
--------------------------------------------------

Build observability from the beginning.

Structured logs:

request_id
trace_id
user_id where appropriate
connection_id
message_id
conversation_id
event
duration
result
error

Metrics:

active_connections
connections_created
connections_closed
messages_received
messages_sent
message_latency
failed_messages
reconnects
auth_failures
rate_limit_hits
db_latency
redis_latency

Use:

- OpenTelemetry where practical
- Prometheus
- Grafana

Create dashboards.

--------------------------------------------------
# 26. DISTRIBUTED TRACING
--------------------------------------------------

Trace:

Client request
→ API
→ WebSocket event
→ message service
→ Redis
→ PostgreSQL
→ acknowledgement

Use correlation IDs.

Never log plaintext encrypted message content.

Be extremely careful about logging sensitive information.

--------------------------------------------------
# 27. RATE LIMITING
--------------------------------------------------

Implement multiple levels where appropriate:

- authentication
- login attempts
- WebSocket connections
- messages
- file uploads
- API requests

Consider:

- per IP
- per account
- per device
- per endpoint

Make limits configurable.

Test bypass attempts.

--------------------------------------------------
# 28. BACKPRESSURE
--------------------------------------------------

Do not allow slow clients to consume unlimited server memory.

Implement:

- bounded queues
- maximum buffered data
- message size limits
- connection limits
- disconnect policies
- backpressure metrics

Document the behavior.

--------------------------------------------------
# 29. FRONTEND ENGINEERING
--------------------------------------------------

Build a clean React architecture.

Separate:

- UI
- domain logic
- network layer
- WebSocket layer
- crypto layer
- state management
- persistence
- synchronization

Do not put everything inside React components.

Use:

- reusable components
- hooks
- typed API clients
- schema validation
- error boundaries
- loading states
- offline states
- accessibility

--------------------------------------------------
# 30. UI/UX
--------------------------------------------------

The interface should be clean and minimal.

Core screens:

- login
- registration
- conversations
- chat
- settings
- devices
- security
- connection status

Show useful states:

CONNECTED
RECONNECTING
OFFLINE
SYNCING
SENDING
DELIVERED
FAILED

Avoid decorative complexity that does not improve the product.

--------------------------------------------------
# 31. API DESIGN
--------------------------------------------------

Use versioned APIs.

Example:

/api/v1/auth
/api/v1/users
/api/v1/conversations
/api/v1/messages
/api/v1/devices
/api/v1/attachments

Define:

- request schemas
- response schemas
- error schemas
- authentication
- authorization
- pagination
- rate limits

Create:

docs/API.md

--------------------------------------------------
# 32. ERROR HANDLING
--------------------------------------------------

Errors must be:

- structured
- typed
- safe
- observable
- actionable

Never expose:

- stack traces
- secrets
- internal database information
- sensitive crypto material

Use consistent error codes.

--------------------------------------------------
# 33. CI/CD
--------------------------------------------------

Build GitHub Actions pipeline.

At minimum:

1. install dependencies
2. lint
3. typecheck
4. unit tests
5. integration tests
6. build
7. security/dependency checks
8. container build

Do not allow broken code to silently merge.

Add caching where useful.

--------------------------------------------------
# 34. CONTAINERIZATION
--------------------------------------------------

Create production-oriented Dockerfiles.

Requirements:

- multi-stage builds
- minimal runtime image
- non-root user
- no unnecessary packages
- health checks
- environment configuration
- graceful shutdown

Never expose secrets through image layers.

--------------------------------------------------
# 35. SECURITY HARDENING
--------------------------------------------------

Implement:

- secure headers
- input validation
- output encoding
- dependency scanning
- secret scanning
- least privilege
- secure cookies where applicable
- CORS policy
- request size limits
- WebSocket limits
- file upload limits
- audit logging

Run security checks regularly.

--------------------------------------------------
# 36. DOCUMENTATION
--------------------------------------------------

The repository must contain professional engineering documentation.

Create:

README.md

docs/
├── ARCHITECTURE.md
├── DATABASE.md
├── API.md
├── WEBSOCKET_PROTOCOL.md
├── CRYPTOGRAPHY.md
├── SECURITY.md
├── THREAT_MODEL.md
├── FAILURE_MODES.md
├── PERFORMANCE.md
├── TESTING.md
├── DEPLOYMENT.md
├── OBSERVABILITY.md
└── ADR/

--------------------------------------------------
# 37. ADR PROCESS
--------------------------------------------------

For important decisions create Architecture Decision Records.

Example:

docs/ADR/0001-modular-monolith.md
docs/ADR/0002-postgresql.md
docs/ADR/0003-redis-presence.md
docs/ADR/0004-websocket-delivery-semantics.md
docs/ADR/0005-client-side-encryption.md

Each ADR:

Title
Status
Context
Decision
Alternatives
Consequences

Do not create ADRs for trivial decisions.

--------------------------------------------------
# 38. GIT ENGINEERING
--------------------------------------------------

Use small, coherent commits.

Commit examples:

feat(auth): add session management
feat(ws): implement heartbeat protocol
feat(messages): add idempotent delivery
test(ws): add reconnect integration tests
perf(db): optimize conversation pagination
docs(security): document threat model
fix(sync): prevent duplicate message insertion

Avoid giant commits such as:

"finished entire project"

--------------------------------------------------
# 39. CODE REVIEW LOOP
--------------------------------------------------

Before considering a phase complete:

Review the diff as if you were a senior engineer.

Ask:

- Is this correct?
- Is this secure?
- Is this maintainable?
- Is this observable?
- Is this tested?
- Is this unnecessarily complex?
- Are there race conditions?
- Are failure cases handled?
- Are types correct?
- Are errors handled?
- Did we introduce technical debt?

Fix findings before proceeding.

--------------------------------------------------
# 40. IMPLEMENTATION PHASES
--------------------------------------------------

PHASE 0
Repository audit

Deliver:

ENGINEERING_BASELINE.md
architecture assessment
technical debt list
implementation plan

STOP AND REVIEW.

--------------------------------------------------

PHASE 1
Architecture foundation

Implement:

- project structure
- configuration system
- typed environment validation
- logging
- error handling
- database connection
- migrations
- health endpoints

Tests required.

--------------------------------------------------

PHASE 2
Authentication

Implement:

- registration
- login
- password hashing
- sessions
- logout
- session revocation
- rate limiting

Security tests required.

--------------------------------------------------

PHASE 3
Conversation system

Implement:

- conversations
- members
- authorization
- message model
- database indexes

Integration tests required.

--------------------------------------------------

PHASE 4
WebSocket protocol

Implement:

- authenticated connections
- heartbeat
- reconnect
- message schema
- acknowledgement
- ordering
- duplicate prevention

WebSocket integration tests required.

--------------------------------------------------

PHASE 5
Real-time messaging

Implement:

- sending
- receiving
- delivery state
- offline messages
- retries
- idempotency

Build failure tests.

--------------------------------------------------

PHASE 6
Redis

Implement:

- presence
- pub/sub where required
- rate limiting
- ephemeral state

Benchmark it.

--------------------------------------------------

PHASE 7
Cryptography

Implement:

- identity keys
- session establishment
- encryption
- decryption
- replay protection
- key lifecycle
- device security

Security review required.

--------------------------------------------------

PHASE 8
Offline synchronization

Implement:

- local queue
- synchronization
- retry
- reconnect
- state reconciliation

Write synchronization invariants.

--------------------------------------------------

PHASE 9
Multi-device

Implement:

- device registration
- device sessions
- device revocation
- cryptographic device identity

--------------------------------------------------

PHASE 10
File sharing

Implement secure encrypted attachments.

Security tests required.

--------------------------------------------------

PHASE 11
Testing expansion

Add:

- unit
- integration
- E2E
- contract
- property-based where useful
- security
- load
- stress

--------------------------------------------------

PHASE 12
Performance engineering

Benchmark:

- WebSocket connections
- messages/sec
- latency
- DB
- Redis
- reconnect storms

Profile bottlenecks.

Optimize only based on measurements.

--------------------------------------------------

PHASE 13
Observability

Implement:

- structured logging
- metrics
- tracing
- Prometheus
- Grafana
- dashboards

--------------------------------------------------

PHASE 14
Failure engineering

Implement controlled tests for:

- DB outage
- Redis outage
- network outage
- server restart
- client disconnect
- duplicate delivery

--------------------------------------------------

PHASE 15
Chaos testing

Introduce controlled failure injection.

Document results.

--------------------------------------------------

PHASE 16
Production hardening

Review:

- security
- performance
- dependency vulnerabilities
- Docker
- configuration
- rate limiting
- logging
- monitoring
- backups
- migrations
- graceful shutdown

--------------------------------------------------

PHASE 17
Final engineering review

Perform complete audit.

Verify:

- tests pass
- typecheck passes
- lint passes
- builds pass
- security checks pass
- benchmark results exist
- documentation matches implementation
- README claims are truthful
- architecture diagrams match code

--------------------------------------------------
# 41. DEFINITION OF DONE
--------------------------------------------------

A feature is NOT complete merely because the code compiles.

A feature is complete when:

[ ] implementation exists
[ ] types are correct
[ ] validation exists
[ ] errors are handled
[ ] tests exist
[ ] security implications reviewed
[ ] observability exists where relevant
[ ] documentation updated
[ ] performance considered
[ ] failure behavior considered
[ ] CI passes
[ ] code review completed

--------------------------------------------------
# 42. ENGINEERING SCORECARD
--------------------------------------------------

Maintain:

docs/ENGINEERING_SCORECARD.md

Track:

Architecture
Security
Correctness
Testing
Performance
Reliability
Observability
Developer Experience
Documentation
Deployment

Do NOT assign fake scores.

Use:

DONE
PARTIAL
MISSING
NOT APPLICABLE

--------------------------------------------------
# 43. EVIDENCE-DRIVEN CLAIMS
--------------------------------------------------

Every impressive claim in the README must have evidence.

Examples:

"Supports 5,000 concurrent connections"

Only write this if benchmark evidence exists.

"p95 latency is 80ms"

Only write this if benchmark evidence exists.

"Messages are end-to-end encrypted"

Only write this if the actual architecture supports it.

"Zero message loss"

Do not make this claim unless it has a precisely defined testable guarantee.

Prefer precise engineering language over marketing language.

--------------------------------------------------
# 44. AI CODING AGENT BEHAVIOR
--------------------------------------------------

You are an engineering agent, not a code-generation vending machine.

Before modifying code:

1. Inspect.
2. Reason.
3. Plan.
4. Implement.
5. Test.
6. Review.
7. Document.

Never:

- overwrite architecture blindly
- delete working functionality without reason
- fabricate tests
- fabricate benchmarks
- fabricate security guarantees
- suppress failing tests
- disable linting just to make CI pass
- remove validation to simplify implementation
- hardcode secrets
- commit credentials
- hide errors
- silently change APIs
- add dependencies without justification

When you encounter uncertainty:

- inspect the code
- inspect tests
- inspect documentation
- inspect dependency behavior
- make the smallest safe assumption
- document the decision

--------------------------------------------------
# 45. LOOP ENGINEERING
--------------------------------------------------

After every significant implementation increment, execute:

LOOP:

1. BUILD
2. TEST
3. INSPECT
4. MEASURE
5. REVIEW
6. IDENTIFY WEAKNESS
7. FIX
8. RE-TEST
9. DOCUMENT
10. COMMIT

Repeat until acceptance criteria are satisfied.

Do not continue to the next major phase if the current phase is fundamentally broken.

--------------------------------------------------
# 46. SELF-CRITIQUE LOOP
--------------------------------------------------

At the end of every phase ask:

"What would a senior backend engineer criticize here?"

Then inspect:

- race conditions
- security
- failure modes
- maintainability
- unnecessary complexity
- performance
- test coverage
- observability
- API consistency
- database correctness

Fix high-value issues.

--------------------------------------------------
# 47. NO PREMATURE OVERENGINEERING
--------------------------------------------------

Do NOT build:

- Kubernetes
- dozens of microservices
- Kafka
- complex service meshes
- unnecessary event sourcing
- unnecessary CQRS
- exotic databases

unless actual requirements or measured bottlenecks justify them.

The objective is engineering maturity, not technology collecting.

--------------------------------------------------
# 48. FINAL PORTFOLIO PRESENTATION
--------------------------------------------------

The final README should communicate:

1. Problem
2. Why privacy matters
3. Architecture
4. Security model
5. Cryptography architecture
6. WebSocket architecture
7. Database architecture
8. Reliability model
9. Offline synchronization
10. Testing strategy
11. Performance benchmarks
12. Failure testing
13. Observability
14. Deployment
15. Engineering decisions
16. Known limitations
17. Future work

Include architecture diagrams.

Include benchmark graphs where real data exists.

Include screenshots/GIFs of the application.

--------------------------------------------------
# 49. RESUME-READY ENGINEERING
--------------------------------------------------

At the end, generate:

docs/RESUME_EVIDENCE.md

Only include claims backed by actual implementation or benchmark evidence.

Potential categories:

- technologies
- architecture
- security
- distributed systems
- performance
- testing
- DevOps
- observability

Generate candidate resume bullets using only verified evidence.

Never exaggerate.

--------------------------------------------------
# 50. FINAL PRINCIPLE
--------------------------------------------------

Build Phantom Chat as if another engineer will inherit it tomorrow.

Build it so that:

A developer can understand it.

A tester can break it.

A security engineer can audit it.

A performance engineer can benchmark it.

An SRE can observe it.

A backend engineer can scale it.

A reviewer can challenge its architectural decisions.

And an interviewer can ask:

"Why did you build it this way?"

and the repository contains the evidence and reasoning to answer.

--------------------------------------------------
# START NOW
--------------------------------------------------

Do NOT immediately implement everything.

Start with PHASE 0.

1. Inspect the entire repository.
2. Produce the architecture/engineering baseline.
3. Identify what already exists.
4. Identify what must be preserved.
5. Identify what must change.
6. Identify security risks.
7. Identify testing gaps.
8. Identify performance risks.
9. Create the implementation roadmap based on the ACTUAL repository.
10. Show the Phase 0 findings.
11. Only after the audit, begin Phase 1.

Important:

The existing repository is the source of truth for what has actually been implemented.

Do not assume a feature exists because this specification mentions it.

Do not claim completion until the implementation and tests prove it.

Begin with repository inspection.