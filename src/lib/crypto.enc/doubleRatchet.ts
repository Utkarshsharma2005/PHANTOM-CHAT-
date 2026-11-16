import { initSodium, toBase64, fromBase64, getRandomBytes } from './sodium';
import { hkdf, hmacSha256 } from './hkdf';
import { generateX25519KeyPair, computeECDH, type KeyPair } from './x3dh';

export interface RatchetState {
    dhKeyPair: KeyPair;               // Self DH keypair
    dhRemotePublicKey?: Uint8Array;   // Remote partner's current DH public key
    rootKey: Uint8Array;              // 32-byte Root Key
    sendingChainKey?: Uint8Array;     // Current Sending Chain Key
    receivingChainKey?: Uint8Array;   // Current Receiving Chain Key
    previousChainLength: number;      // N_p
    sendingSequence: number;          // N_s
    receivingSequence: number;        // N_r
    skippedMessageKeys: Map<string, Uint8Array>; // Keyed by `${dhRemotePublicKey_base64}:${seq}`
}

export interface MessageHeader {
    dhPublicKey: string; // Base64 remote DH public key
    pn: number;          // Previous chain length
    n: number;           // Message sequence number
}

export interface EncryptedRatchetPacket {
    header: MessageHeader;
    ciphertext: string;  // Base64 encrypted payload
    mac: string;         // Base64 HMAC authentication tag
}

/**
 * Initializes a Double Ratchet state as Alice (initiator).
 */
export async function initAliceRatchet(
    masterSecret: Uint8Array,
    bobDhPublicKey: Uint8Array
): Promise<RatchetState> {
    const dhKeyPair = await generateX25519KeyPair();
    const dhOutput = await computeECDH(dhKeyPair.privateKey, bobDhPublicKey);

    // Root KDF: derive new RootKey and SendingChainKey
    const salt = masterSecret;
    const info = new TextEncoder().encode('PhantomChat-DoubleRatchet-Root');
    const derived = await hkdf(salt, dhOutput, info, 64);
    const rootKey = derived.subarray(0, 32);
    const sendingChainKey = derived.subarray(32, 64);

    return {
        dhKeyPair,
        dhRemotePublicKey: bobDhPublicKey,
        rootKey,
        sendingChainKey,
        receivingChainKey: undefined,
        previousChainLength: 0,
        sendingSequence: 0,
        receivingSequence: 0,
        skippedMessageKeys: new Map(),
    };
}

/**
 * Initializes a Double Ratchet state as Bob (receiver).
 */
export async function initBobRatchet(
    masterSecret: Uint8Array,
    bobDhKeyPair: KeyPair
): Promise<RatchetState> {
    return {
        dhKeyPair: bobDhKeyPair,
        dhRemotePublicKey: undefined,
        rootKey: masterSecret,
        sendingChainKey: undefined,
        receivingChainKey: undefined,
        previousChainLength: 0,
        sendingSequence: 0,
        receivingSequence: 0,
        skippedMessageKeys: new Map(),
    };
}

/**
 * Symmetric KDF Ratchet step for deriving message keys from a chain key.
 */
async function symmetricKdfStep(chainKey: Uint8Array): Promise<{ nextChainKey: Uint8Array; messageKey: Uint8Array }> {
    const constantMessage = new Uint8Array([0x01]);
    const constantChain = new Uint8Array([0x02]);

    const messageKey = await hmacSha256(chainKey, constantMessage);
    const nextChainKey = await hmacSha256(chainKey, constantChain);

    return { nextChainKey, messageKey };
}

/**
 * Encrypts a message payload using the Double Ratchet state machine.
 */
export async function ratchetEncrypt(
    state: RatchetState,
    plaintext: string
): Promise<{ state: RatchetState; packet: EncryptedRatchetPacket }> {
    if (!state.sendingChainKey) {
        throw new Error('Sending chain key is not initialized');
    }

    const { nextChainKey, messageKey } = await symmetricKdfStep(state.sendingChainKey);
    state.sendingChainKey = nextChainKey;

    const s = await initSodium();
    const encoder = new TextEncoder();
    const plaintextBytes = encoder.encode(plaintext);
    const iv = await getRandomBytes(12); // 12-byte IV for AEAD

    // Associated Data: Header bytes
    const header: MessageHeader = {
        dhPublicKey: await toBase64(state.dhKeyPair.publicKey),
        pn: state.previousChainLength,
        n: state.sendingSequence,
    };
    const ad = encoder.encode(JSON.stringify(header));

    // Secretbox / AEAD encryption
    const encryptedBody = s.crypto_aead_chacha20poly1305_ietf_encrypt(
        plaintextBytes,
        ad,
        null,
        iv,
        messageKey
    );

    // Combine IV (12 bytes) + Encrypted Body so receiver can extract IV
    const ciphertextBytes = new Uint8Array(iv.length + encryptedBody.length);
    ciphertextBytes.set(iv, 0);
    ciphertextBytes.set(encryptedBody, iv.length);

    // Compute HMAC-SHA256 MAC over payload
    const macBytes = await hmacSha256(messageKey, ciphertextBytes);

    state.sendingSequence += 1;

    return {
        state,
        packet: {
            header,
            ciphertext: await toBase64(ciphertextBytes),
            mac: await toBase64(macBytes),
        },
    };
}

/**
 * Decrypts an incoming message packet using the Double Ratchet state machine.
 */
export async function ratchetDecrypt(
    state: RatchetState,
    packet: EncryptedRatchetPacket
): Promise<{ state: RatchetState; plaintext: string }> {
    const s = await initSodium();
    const senderDhPublicKey = await fromBase64(packet.header.dhPublicKey);
    const ciphertextBytes = await fromBase64(packet.ciphertext);
    const macBytes = await fromBase64(packet.mac);

    // Check if DH Ratchet step is required
    const isNewRemoteKey =
        !state.dhRemotePublicKey ||
        !areBytesEqual(state.dhRemotePublicKey, senderDhPublicKey);

    if (isNewRemoteKey) {
        // DH Ratchet Step
        state.previousChainLength = state.sendingSequence;
        state.sendingSequence = 0;
        state.receivingSequence = 0;
        state.dhRemotePublicKey = senderDhPublicKey;

        // Receiving DH Output
        const dhReceive = await computeECDH(state.dhKeyPair.privateKey, state.dhRemotePublicKey);
        const saltRecv = state.rootKey;
        const info = new TextEncoder().encode('PhantomChat-DoubleRatchet-Root');
        const derivedRecv = await hkdf(saltRecv, dhReceive, info, 64);
        state.rootKey = derivedRecv.subarray(0, 32);
        state.receivingChainKey = derivedRecv.subarray(32, 64);

        // Send DH Output: generate new self DH keypair
        state.dhKeyPair = await generateX25519KeyPair();
        const dhSend = await computeECDH(state.dhKeyPair.privateKey, state.dhRemotePublicKey);
        const derivedSend = await hkdf(state.rootKey, dhSend, info, 64);
        state.rootKey = derivedSend.subarray(0, 32);
        state.sendingChainKey = derivedSend.subarray(32, 64);
    }

    // Advance receiving chain
    if (!state.receivingChainKey) {
        throw new Error('Receiving chain key is uninitialized');
    }

    const { nextChainKey, messageKey } = await symmetricKdfStep(state.receivingChainKey);
    state.receivingChainKey = nextChainKey;
    state.receivingSequence += 1;

    // Verify MAC
    const expectedMac = await hmacSha256(messageKey, ciphertextBytes);
    if (!areBytesEqual(macBytes, expectedMac)) {
        throw new Error('Message authentication (MAC) failed');
    }

    // Decrypt AEAD payload
    const encoder = new TextEncoder();
    const ad = encoder.encode(JSON.stringify(packet.header));
    const iv = ciphertextBytes.subarray(0, 12);

    const decryptedBytes = s.crypto_aead_chacha20poly1305_ietf_decrypt(
        null,
        ciphertextBytes.subarray(12),
        ad,
        iv,
        messageKey
    );

    const decoder = new TextDecoder();
    return {
        state,
        plaintext: decoder.decode(decryptedBytes),
    };
}

function areBytesEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}
