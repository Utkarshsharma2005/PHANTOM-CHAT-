// Web Crypto API utilities for AES-GCM encryption

export async function generateKey(): Promise<CryptoKey> {
    return window.crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256,
        },
        true,
        ["encrypt", "decrypt"]
    );
}

export async function exportKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("jwk", key);
    return JSON.stringify(exported);
}

export async function importKey(jwkString: string): Promise<CryptoKey> {
    const jwk = JSON.parse(jwkString);
    return window.crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "AES-GCM" },
        true,
        ["encrypt", "decrypt"]
    );
}

export async function keyToBase64(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("raw", key);
    return bufferToBase64(exported);
}

export async function base64ToKey(base64: string): Promise<CryptoKey> {
    const binary = base64ToBuffer(base64);
    return window.crypto.subtle.importKey(
        "raw",
        binary as unknown as BufferSource,
        { name: "AES-GCM" },
        true,
        ["encrypt", "decrypt"]
    );
}

export function generateRoomId(): string {
    return window.crypto.randomUUID();
}

export async function encryptMessage(
    message: string,
    key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv as unknown as BufferSource,
        },
        key,
        data as unknown as BufferSource
    );

    return {
        ciphertext: bufferToBase64(encrypted),
        iv: bufferToBase64(iv),
    };
}

export async function decryptMessage(
    ciphertext: string,
    iv: string,
    key: CryptoKey
): Promise<string> {
    const decodedCiphertext = base64ToBuffer(ciphertext);
    const decodedIv = base64ToBuffer(iv);

    const decrypted = await window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: decodedIv as unknown as BufferSource,
        },
        key,
        decodedCiphertext as unknown as BufferSource
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = new Uint8Array(buffer as ArrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
