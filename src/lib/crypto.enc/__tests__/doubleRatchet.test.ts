// src/lib/crypto/__tests__/doubleRatchet.test.ts
import {
  initAliceRatchet,
  initBobRatchet,
  ratchetEncrypt,
  ratchetDecrypt,
} from "../doubleRatchet";
import { generateX25519KeyPair, computeECDH } from "../x3dh";
import { expect, test } from "vitest";

/**
 * Helper to derive a master secret using a simple X25519 ECDH.
 * In a real X3DH handshake the master secret comes from a combination of DHs,
 * but for the purpose of this unit test a single shared secret is sufficient.
 */
async function deriveMasterSecret() {
  const alice = await generateX25519KeyPair();
  const bob = await generateX25519KeyPair();
  const secret = await computeECDH(alice.privateKey, bob.publicKey);
  return { secret, alice, bob };
}

test("Full Double Ratchet message exchange between Alice and Bob", async () => {
  const { secret, bob } = await deriveMasterSecret();

  // Initialise ratchet states for both parties
  const aliceState = await initAliceRatchet(secret, bob.publicKey);
  const bobState = await initBobRatchet(secret, bob);

  // Alice sends a message to Bob
  const messageA = "Hello Bob, this is Alice!";
  const { state: aliceStateAfterSend, packet } = await ratchetEncrypt(aliceState, messageA);

  // Bob receives and decrypts
  const { state: bobStateAfterRecv, plaintext: decryptedA } = await ratchetDecrypt(bobState, packet);
  expect(decryptedA).toBe(messageA);

  // Bob replies to Alice using his updated state
  const messageB = "Hi Alice, nice to hear from you!";
  const { state: bobStateAfterSend, packet: packetB } = await ratchetEncrypt(bobStateAfterRecv, messageB);

  // Alice decrypts Bob's reply
  const { state: aliceStateAfterRecv, plaintext: decryptedB } = await ratchetDecrypt(aliceStateAfterSend, packetB);
  expect(decryptedB).toBe(messageB);

  // Ensure both parties have progressed their ratchet sequences
  expect(aliceStateAfterRecv.receivingSequence).toBeGreaterThanOrEqual(1);
  expect(bobStateAfterSend.sendingSequence).toBeGreaterThanOrEqual(1);
});
