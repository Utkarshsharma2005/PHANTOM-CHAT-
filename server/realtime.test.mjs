import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { randomUUID, webcrypto } from 'node:crypto';
import WebSocket from 'ws';

let child;
let port;
const roomId = '4f7a8d92-34be-4c8e-a260-3c87e27a8a11';
const expiresAt = Date.now() + 60_000;
const origin = 'http://localhost:5173';

function reservePort() {
  return new Promise((resolve, reject) => {
    const socket = createServer();
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', () => {
      const address = socket.address();
      socket.close(() => resolve(address.port));
    });
  });
}

function waitForMessage(socket, predicate = () => true) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for WebSocket message')), 3000);
    const onMessage = raw => {
      const parsed = JSON.parse(raw.toString());
      if (!predicate(parsed)) return;
      clearTimeout(timeout);
      socket.off('message', onMessage);
      resolve(parsed);
    };
    socket.on('message', onMessage);
  });
}

function connect(room = roomId, expiry = expiresAt, clientOrigin = origin) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws?roomId=${room}&expiresAt=${expiry}`, { headers: { Origin: clientOrigin } });
    socket.once('open', () => resolve(socket));
    socket.once('error', reject);
  });
}

before(async () => {
  port = await reservePort();
  child = spawn(process.execPath, ['server/index.mjs'], {
    env: { ...process.env, NODE_ENV: 'development', PORT: String(port), CORS_ORIGINS: origin, MAX_MESSAGES_PER_WINDOW: '150' },
    stdio: 'ignore',
  });
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try { if ((await fetch(`http://127.0.0.1:${port}/healthz`)).ok) return; } catch { /* Wait for listen. */ }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Realtime backend did not start');
});

after(() => { child?.kill('SIGTERM'); });

test('relays only encrypted message envelopes and restores them from history', async () => {
  const sender = await connect();
  const receiver = await connect();
  try {
    const received = waitForMessage(receiver, packet => packet.type === 'message');
    const ack = waitForMessage(sender, packet => packet.type === 'ack');
    const id = '13f8afef-53da-4f5e-a105-891410b74091';
    const timestamp = Date.now();
    const senderName = 'alice';
    const aad = new TextEncoder().encode(`${roomId}:${id}:${senderName}:${timestamp}`);
    const key = await webcrypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, new TextEncoder().encode('message from the browser'));
    const message = {
      id,
      ciphertext: Buffer.from(ciphertext).toString('base64'),
      iv: Buffer.from(iv).toString('base64'),
      sender: senderName,
      timestamp,
    };
    sender.send(JSON.stringify({ type: 'send', message }));
    const relayed = (await received).message;
    assert.deepEqual(relayed, message);
    const decrypted = await webcrypto.subtle.decrypt(
      { name: 'AES-GCM', iv: Buffer.from(relayed.iv, 'base64'), additionalData: aad },
      key,
      Buffer.from(relayed.ciphertext, 'base64'),
    );
    assert.equal(new TextDecoder().decode(decrypted), 'message from the browser');
    assert.equal((await ack).id, message.id);
    const historyResponse = await fetch(`http://127.0.0.1:${port}/api/rooms/${roomId}/messages?expiresAt=${expiresAt}`);
    assert.equal(historyResponse.status, 200);
    const history = await historyResponse.json();
    assert.equal(history.messages.length, 1);
    assert.equal(history.messages[0].ciphertext, message.ciphertext);
    assert.equal(JSON.stringify(history).includes('plaintext'), false);
    const duplicateRelay = waitForMessage(receiver, packet => packet.type === 'message' && packet.message.id === message.id);
    const duplicateAck = waitForMessage(sender, packet => packet.type === 'ack');
    sender.send(JSON.stringify({ type: 'send', message }));
    assert.deepEqual((await duplicateRelay).message, message);
    assert.equal((await duplicateAck).id, message.id);
    const duplicateHistory = await (await fetch(`http://127.0.0.1:${port}/api/rooms/${roomId}/messages?expiresAt=${expiresAt}`)).json();
    assert.equal(duplicateHistory.messages.length, 1);

    receiver.close();
    const reconnected = await connect();
    try {
      const restored = await (await fetch(`http://127.0.0.1:${port}/api/rooms/${roomId}/messages?expiresAt=${expiresAt}`)).json();
      assert.equal(restored.messages[0].id, message.id);
    } finally { reconnected.close(); }
  } finally { sender.close(); receiver.close(); }
});

test('rejects an untrusted browser origin', async () => {
  await new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws?roomId=${roomId}&expiresAt=${expiresAt}`, { headers: { Origin: 'https://attacker.invalid' } });
    socket.once('unexpected-response', (_request, response) => {
      assert.equal(response.statusCode, 403);
      resolve();
    });
    socket.once('open', () => { socket.close(); reject(new Error('Untrusted origin connected')); });
    socket.once('error', () => resolve());
  });
});

test('accepts the alternate localhost port Vite selects in development', async () => {
  const socket = await connect(roomId, expiresAt, 'http://localhost:5174');
  try {
    assert.equal((await waitForMessage(socket, packet => packet.type === 'ready')).type, 'ready');
  } finally { socket.close(); }
});

test('rejects malformed room identifiers', async () => {
  const response = await fetch(`http://127.0.0.1:${port}/api/rooms/nope/messages?expiresAt=${expiresAt}`);
  assert.equal(response.status, 400);
});

test('room expiration blocks history access and reconnects', async () => {
  const expiringRoom = '745644b8-e694-4914-86f1-9756ae6318ba';
  const expiresSoon = Date.now() + 250;
  const socket = await connect(expiringRoom, expiresSoon);
  try {
    assert.equal((await waitForMessage(socket, packet => packet.type === 'ready')).type, 'ready');
    await new Promise(resolve => setTimeout(resolve, 300));
    const history = await fetch(`http://127.0.0.1:${port}/api/rooms/${expiringRoom}/messages?expiresAt=${expiresSoon}`);
    assert.equal(history.status, 410);
    await new Promise((resolve, reject) => {
      const expired = new WebSocket(`ws://127.0.0.1:${port}/ws?roomId=${expiringRoom}&expiresAt=${expiresSoon}`, { headers: { Origin: origin } });
      expired.once('unexpected-response', (_request, response) => {
        assert.equal(response.statusCode, 403);
        resolve();
      });
      expired.once('open', () => { expired.close(); reject(new Error('Expired room reconnected')); });
      expired.once('error', () => resolve());
    });
  } finally { socket.close(); }
});

test('history pagination returns every stored message once', async () => {
  const pagedRoom = '19b08a02-90cb-49ee-bf8e-08eef9b804e2';
  const socket = await connect(pagedRoom, expiresAt);
  try {
    await waitForMessage(socket, packet => packet.type === 'ready');
    for (let index = 0; index < 101; index += 1) {
      const message = { id: randomUUID(), ciphertext: `cipher-${index}`, iv: 'iv', sender: 'alice', timestamp: Date.now() };
      const ack = waitForMessage(socket, packet => packet.type === 'ack' && packet.id === message.id);
      socket.send(JSON.stringify({ type: 'send', message }));
      assert.equal((await ack).id, message.id);
    }
    const first = await (await fetch(`http://127.0.0.1:${port}/api/rooms/${pagedRoom}/messages?expiresAt=${expiresAt}`)).json();
    assert.equal(first.messages.length, 100);
    assert.ok(first.nextCursor);
    const query = new URLSearchParams({ expiresAt: String(expiresAt), before: String(first.nextCursor.before), beforeId: first.nextCursor.beforeId });
    const second = await (await fetch(`http://127.0.0.1:${port}/api/rooms/${pagedRoom}/messages?${query}`)).json();
    assert.equal(second.messages.length, 1);
    assert.equal(second.nextCursor, null);
    assert.equal(new Set([...first.messages, ...second.messages].map(message => message.id)).size, 101);
  } finally { socket.close(); }
});
