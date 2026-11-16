# Deployment source encryption proposal (not adopted)

The earlier idea to AES-CBC-encrypt application source files during deployment and decrypt them on the production server is intentionally not implemented. The runtime must access the decrypted code to execute it, so this does not protect the application from the production host or its operators. It also creates deployment and key-management risks without protecting browser-delivered code.

The application instead keeps room encryption keys in the browser and sends only encrypted message envelopes to the backend. See `docs/CRYPTOGRAPHY.md` for the actual guarantees and limitations.
