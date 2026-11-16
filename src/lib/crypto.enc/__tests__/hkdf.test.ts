// src/lib/crypto/__tests__/hkdf.test.ts
import { hkdf } from "../hkdf";
import { expect, test } from "vitest";

// RFC 5869 Test Vector 1 (SHA-256)
const ikm = new Uint8Array([
  0x0b, 0x0b, 0x0b, 0x0b, 0x0b, 0x0b, 0x0b, 0x0b,
  0x0b, 0x0b, 0x0b, 0x0b, 0x0b, 0x0b, 0x0b, 0x0b,
  0x0b, 0x0b, 0x0b, 0x0b, 0x0b, 0x0b,
]);
const salt = new Uint8Array([
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
  0x08, 0x09, 0x0a, 0x0b, 0x0c,
]);
const info = new Uint8Array([
  0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9,
]);
const length = 42; // bytes

// Expected OKM from RFC 5869 (hex)
const expectedHex =
  "3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865";

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

test("HKDF produces RFC 5869 Test Vector 1 output", async () => {
  const okm = await hkdf(salt, ikm, info, length);
  const expected = hexToUint8Array(expectedHex);
  expect(okm).toEqual(expected);
});
