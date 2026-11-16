import { afterAll, beforeAll, expect, test } from 'vitest';
import { base64ToKey, decryptMessage, encryptMessage } from '../src/lib/crypto.ts';

let previousWindow;
beforeAll(() => {
  previousWindow = globalThis.window;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: globalThis });
});
afterAll(() => {
  if (previousWindow === undefined) delete globalThis.window;
  else Object.defineProperty(globalThis, 'window', { configurable: true, value: previousWindow });
});

test('AES-GCM binds ciphertext to its room, message ID, and sender', async () => {
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const key = await base64ToKey(btoa(String.fromCharCode(...keyBytes)));
  const context = 'room-1:message-1:alice';
  const packet = await encryptMessage('private note', key, context);
  await expect(decryptMessage(packet.ciphertext, packet.iv, key, context)).resolves.toBe('private note');
  await expect(decryptMessage(packet.ciphertext, packet.iv, key, 'room-1:message-1:mallory')).rejects.toThrow();
});

test('AES-GCM rejects ciphertext changes', async () => {
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const key = await base64ToKey(btoa(String.fromCharCode(...keyBytes)));
  const packet = await encryptMessage('message', key, 'room:id:sender');
  const changed = packet.ciphertext.slice(0, -2) + 'AA';
  await expect(decryptMessage(changed, packet.iv, key, 'room:id:sender')).rejects.toThrow();
});

test('room key import rejects malformed or non-256-bit keys', async () => {
  await expect(base64ToKey('not-base64')).rejects.toThrow();
  await expect(base64ToKey(btoa('too short'))).rejects.toThrow(/256 bits/);
});

test('message decryption rejects malformed IVs before Web Crypto', async () => {
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const key = await base64ToKey(btoa(String.fromCharCode(...keyBytes)));
  const packet = await encryptMessage('private note', key, 'room:id:sender');
  await expect(decryptMessage(packet.ciphertext, btoa('short'), key, 'room:id:sender')).rejects.toThrow(/envelope/);
});
