# Cryptography in the current implementation

## Active message path

1. Room creation generates a random 256-bit AES-GCM key with the browser Web Crypto API.
2. The room key is shared via the URL fragment (`#key=...`). Browsers do not include fragments in HTTP requests or Referer headers. The app imports the key and removes the fragment from the address bar once the user enters the room.
3. Each message uses a fresh 96-bit random IV and AES-GCM. The AAD is the UTF-8 encoding of `roomId:messageId:sender:timestamp`, binding the ciphertext to its room, stable message ID, display name, and displayed timestamp.
4. The backend stores/routes the ciphertext envelope and metadata. It never receives the room key or plaintext.
5. The active key is imported as non-exportable and saved in IndexedDB to restore after reload. An encrypted outbox is kept in localStorage until the server acknowledges delivery.

## Exact guarantees and limits

This is shared-key browser-side message encryption, not the Signal protocol. It provides confidentiality and integrity of message contents to holders of the invite key while that key and their browser remain private. Anyone with the invite can decrypt all room messages, and the server can see room membership timing, sender labels, IP/connection metadata, message lengths, and message timing. There is no authenticated identity, forward secrecy, post-compromise recovery, key verification, key rotation, device revocation, or protection from compromised browser code/endpoints. The local non-exportable key is a browser API control; it does not protect against same-origin script execution or malware using the unlocked profile.

The custom `src/lib/crypto.enc` X3DH/Double Ratchet code is experimental, is not used by the chat flow, and must not be relied on for production security. It requires protocol review and additional tests before any integration. No Signal compatibility claim is made.

## Before making stronger claims

Select a maintained protocol implementation that supports browsers and the required group/room model. Define authenticated device identities, key verification, prekey lifecycle, rotation and recovery, replay/reordering behavior, multi-device semantics, storage protection, and compromise handling. Use independent cryptographic review. Add test vectors and adversarial protocol tests before deployment. Do not roll a custom ratchet implementation into production as a substitute for that review.
