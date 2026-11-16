import sodium from 'libsodium-wrappers';

let isReady = false;

/**
 * Ensures libsodium WebAssembly module is fully loaded and ready for use.
 */
export async function initSodium(): Promise<typeof sodium> {
    if (!isReady) {
        await sodium.ready;
        isReady = true;
    }
    return sodium;
}

/**
 * Returns a cryptographically secure random byte buffer of given length.
 */
export async function getRandomBytes(length: number): Promise<Uint8Array> {
    const s = await initSodium();
    return s.randombytes_buf(length);
}

/**
 * Converts Uint8Array to Base64 string.
 */
export async function toBase64(bytes: Uint8Array): Promise<string> {
    const s = await initSodium();
    return s.to_base64(bytes, s.base64_variants.ORIGINAL);
}

/**
 * Converts Base64 string to Uint8Array.
 */
export async function fromBase64(base64Str: string): Promise<Uint8Array> {
    const s = await initSodium();
    return s.from_base64(base64Str, s.base64_variants.ORIGINAL);
}
