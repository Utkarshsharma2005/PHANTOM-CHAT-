import { initSodium } from './sodium';
import { hkdf } from './hkdf';

export interface KeyPair {
    publicKey: Uint8Array;
    privateKey: Uint8Array;
}

export interface PrekeyBundle {
    identityPublicKey: Uint8Array;     // X25519 public key
    signedPrekey: Uint8Array;          // X25519 public key
    signedPrekeySignature: Uint8Array; // Ed25519 signature over signedPrekey
    oneTimePrekey?: Uint8Array;        // X25519 public key (optional)
}

export interface X3DHHandshakeResult {
    masterSecret: Uint8Array;
    ephemeralPublicKey: Uint8Array;
}

/**
 * Generates an X25519 keypair for encryption / key agreement.
 */
export async function generateX25519KeyPair(): Promise<KeyPair> {
    const s = await initSodium();
    const kp = s.crypto_kx_keypair();
    return {
        publicKey: kp.publicKey,
        privateKey: kp.privateKey,
    };
}

/**
 * Generates an Ed25519 keypair for identity digital signatures.
 */
export async function generateEd25519KeyPair(): Promise<KeyPair> {
    const s = await initSodium();
    const kp = s.crypto_sign_keypair();
    return {
        publicKey: kp.publicKey,
        privateKey: kp.privateKey,
    };
}

/**
 * Signs data using Ed25519 private key.
 */
export async function signData(data: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array> {
    const s = await initSodium();
    return s.crypto_sign_detached(data, privateKey);
}

/**
 * Verifies Ed25519 signature over data using public key.
 */
export async function verifySignature(
    signature: Uint8Array,
    data: Uint8Array,
    publicKey: Uint8Array
): Promise<boolean> {
    const s = await initSodium();
    return s.crypto_sign_verify_detached(signature, data, publicKey);
}

/**
 * Computes Elliptic Curve Diffie-Hellman (ECDH) shared secret between X25519 private key & public key.
 */
export async function computeECDH(privateKey: Uint8Array, publicKey: Uint8Array): Promise<Uint8Array> {
    const s = await initSodium();
    return s.crypto_scalarmult(privateKey, publicKey);
}

/**
 * Performs X3DH Handshake on Initiator (Alice) side:
 * DH1 = ECDH(IK_A, SPK_B)
 * DH2 = ECDH(EK_A, IK_B)
 * DH3 = ECDH(EK_A, SPK_B)
 * DH4 = ECDH(EK_A, OPK_B) [optional]
 */
export async function initiateX3DH(
    identityKeyPair: KeyPair,
    recipientBundle: PrekeyBundle
    
): Promise<X3DHHandshakeResult> {
    // 1. Generate Ephemeral Keypair EK_A
    const ephemeralKeyPair = await generateX25519KeyPair();

    // 2. Perform DH operations
    const dh1 = await computeECDH(identityKeyPair.privateKey, recipientBundle.signedPrekey);
    const dh2 = await computeECDH(ephemeralKeyPair.privateKey, recipientBundle.identityPublicKey);
    const dh3 = await computeECDH(ephemeralKeyPair.privateKey, recipientBundle.signedPrekey);

    let dhConcat: Uint8Array;
    if (recipientBundle.oneTimePrekey) {
        const dh4 = await computeECDH(ephemeralKeyPair.privateKey, recipientBundle.oneTimePrekey);
        dhConcat = new Uint8Array(dh1.length + dh2.length + dh3.length + dh4.length);
        dhConcat.set(dh1, 0);
        dhConcat.set(dh2, dh1.length);
        dhConcat.set(dh3, dh1.length + dh2.length);
        dhConcat.set(dh4, dh1.length + dh2.length + dh3.length);
    } else {
        dhConcat = new Uint8Array(dh1.length + dh2.length + dh3.length);
        dhConcat.set(dh1, 0);
        dhConcat.set(dh2, dh1.length);
        dhConcat.set(dh3, dh1.length + dh2.length);
    }

    // 3. Derive Master Shared Secret via HKDF-SHA256
    const salt = new Uint8Array(32); // 32 zero bytes
    const info = new TextEncoder().encode('PhantomChat-X3DH-MasterSecret');
    const masterSecret = await hkdf(salt, dhConcat, info, 32);

    return {
        masterSecret,
        ephemeralPublicKey: ephemeralKeyPair.publicKey,
    };
}

/**
 * Performs X3DH Handshake on Receiver (Bob) side when receiving initial message:
 * DH1 = ECDH(SPK_B, IK_A)
 * DH2 = ECDH(IK_B, EK_A)
 * DH3 = ECDH(SPK_B, EK_A)
 * DH4 = ECDH(OPK_B, EK_A) [optional]
 */
export async function receiveX3DH(
    identityKeyPair: KeyPair,
    signedPrekeyPrivateKey: Uint8Array,
    senderIdentityPublicKey: Uint8Array,
    senderEphemeralPublicKey: Uint8Array,
    oneTimePrekeyPrivateKey?: Uint8Array
): Promise<Uint8Array> {
    const dh1 = await computeECDH(signedPrekeyPrivateKey, senderIdentityPublicKey);
    const dh2 = await computeECDH(identityKeyPair.privateKey, senderEphemeralPublicKey);
    const dh3 = await computeECDH(signedPrekeyPrivateKey, senderEphemeralPublicKey);

    let dhConcat: Uint8Array;
    if (oneTimePrekeyPrivateKey) {
        const dh4 = await computeECDH(oneTimePrekeyPrivateKey, senderEphemeralPublicKey);
        dhConcat = new Uint8Array(dh1.length + dh2.length + dh3.length + dh4.length);
        dhConcat.set(dh1, 0);
        dhConcat.set(dh2, dh1.length);
        dhConcat.set(dh3, dh1.length + dh2.length);
        dhConcat.set(dh4, dh1.length + dh2.length + dh3.length);
    } else {
        dhConcat = new Uint8Array(dh1.length + dh2.length + dh3.length);
        dhConcat.set(dh1, 0);
        dhConcat.set(dh2, dh1.length);
        dhConcat.set(dh3, dh1.length + dh2.length);
    }

    const salt = new Uint8Array(32);
    const info = new TextEncoder().encode('PhantomChat-X3DH-MasterSecret');
    return hkdf(salt, dhConcat, info, 32);
}
