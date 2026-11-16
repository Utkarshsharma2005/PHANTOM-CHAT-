/**
 * Helper to ensure a Uint8Array is backed by an owned ArrayBuffer for subtle crypto
 */
function toArrayBuffer(view: Uint8Array): ArrayBuffer {
    return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
}

/**
 * Computes HMAC-SHA256 over key and data.
 */
export async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
    const subtle = globalThis.crypto.subtle;
    const cryptoKey = await subtle.importKey(
        'raw',
        toArrayBuffer(key),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await subtle.sign('HMAC', cryptoKey, toArrayBuffer(data));
    return new Uint8Array(signature);
}

/**
 * HKDF-Extract(salt, ikm) -> PRK (Pseudo-Random Key)
 */
export async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
    const effectiveSalt = salt.length === 0 ? new Uint8Array(32) : salt;
    return hmacSha256(effectiveSalt, ikm);
}

/**
 * HKDF-Expand(prk, info, length) -> Derived Key Material
 */
export async function hkdfExpand(
    prk: Uint8Array,
    info: Uint8Array,
    length: number
): Promise<Uint8Array> {
    const hashLen = 32; // SHA-256 output length
    const N = Math.ceil(length / hashLen);
    if (N > 255) {
        throw new Error('HKDF-Expand requested length is too large');
    }

    const okm = new Uint8Array(length);
    let previousT: Uint8Array<ArrayBufferLike> = new Uint8Array(0);
    let offset = 0;

    for (let i = 1; i <= N; i++) {
        const input = new Uint8Array(previousT.length + info.length + 1);
        input.set(previousT, 0);
        input.set(info, previousT.length);
        input[input.length - 1] = i;

        previousT = await hmacSha256(prk, input);

        const bytesToCopy = Math.min(hashLen, length - offset);
        okm.set(previousT.subarray(0, bytesToCopy), offset);
        offset += bytesToCopy;
    }

    return okm;
}

/**
 * HKDF (Extract & Expand) in a single step according to RFC 5869.
 */
export async function hkdf(
    salt: Uint8Array,
    ikm: Uint8Array,
    info: Uint8Array,
    length: number
): Promise<Uint8Array> {
    const prk = await hkdfExtract(salt, ikm);
    return hkdfExpand(prk, info, length);
}
