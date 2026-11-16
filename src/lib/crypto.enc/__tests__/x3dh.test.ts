// src/lib/crypto/__tests__/x3dh.test.ts
import { generateX25519KeyPair, computeECDH } from "../x3dh";
import { expect, test } from "vitest";

test("X3DH key generation produces 32‑byte keys", async () => {
  const kp = await generateX25519KeyPair();
  expect(kp.publicKey.length).toBe(32);
  expect(kp.privateKey.length).toBe(32);
});

test("ECDH between two keypairs yields identical shared secret", async () => {
  const alice = await generateX25519KeyPair();
  const bob = await generateX25519KeyPair();
  const secret1 = await computeECDH(alice.privateKey, bob.publicKey);
  const secret2 = await computeECDH(bob.privateKey, alice.publicKey);
  expect(secret1).toEqual(secret2);
});
