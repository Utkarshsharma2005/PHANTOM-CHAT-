import 'dotenv/config';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { MongoClient } from 'mongodb';
import { createClient } from 'redis';
import { z } from 'zod';

const config = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().optional(),
  REDIS_URL: z.string().optional(),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  MESSAGE_TTL_DAYS: z.coerce.number().int().positive().default(7),
  MAX_MESSAGE_BYTES: z.coerce.number().int().positive().default(16_384),
  MAX_CONNECTIONS: z.coerce.number().int().positive().default(2000),
  MAX_CONNECTIONS_PER_IP: z.coerce.number().int().positive().default(20),
  MAX_MESSAGES_PER_WINDOW: z.coerce.number().int().positive().default(30),
  TRUST_CF_CONNECTING_IP: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
}).parse(process.env);
if (config.NODE_ENV === 'production' && (!config.MONGODB_URI || !config.REDIS_URL)) {
  throw new Error('MONGODB_URI and REDIS_URL are required in production');
}

const allowedOrigins = new Set(config.CORS_ORIGINS.split(',').map(value => value.trim()).filter(Boolean));
function originAllowed(origin) {
  if (!origin) return false;
  if (allowedOrigins.has(origin)) return true;
  if (config.NODE_ENV !== 'development') return false;
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  } catch { return false; }
}
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (originAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(originAllowed(origin) ? 204 : 403);
  next();
});
app.use(express.json({ limit: `${config.MAX_MESSAGE_BYTES + 1024}b` }));

let messages;
let rooms;
let mongo;
let redis;
let publisher;
let subscriber;
const localRooms = new Map();
const localRoomExpiries = new Map();
const localRate = new Map();
const instanceId = randomUUID();
const topic = 'phantom:room-message';

if (config.MONGODB_URI) {
  mongo = new MongoClient(config.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await mongo.connect();
  const db = mongo.db();
  messages = db.collection('messages');
  rooms = db.collection('rooms');
  await rooms.createIndex({ roomId: 1 }, { unique: true });
  await rooms.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await messages.createIndex({ roomId: 1, createdAt: -1, messageId: -1 });
  await messages.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await messages.createIndex({ roomId: 1, messageId: 1 }, { unique: true });
}

if (config.REDIS_URL) {
  redis = createClient({ url: config.REDIS_URL });
  redis.on('error', error => console.error('redis_error', { name: error.name }));
  await redis.connect();
  publisher = redis.duplicate();
  subscriber = redis.duplicate();
  await Promise.all([publisher.connect(), subscriber.connect()]);
  await subscriber.subscribe(topic, raw => {
    try {
      const event = JSON.parse(raw);
      void redis.del(`phantom:history:${event.roomId}`).catch(() => {});
      if (event.instanceId !== instanceId) broadcastLocal(event.roomId, event.packet);
    } catch { /* Ignore malformed internal events. */ }
  });
}

function validRoomId(value) {
  return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);
}

function messageEnvelope(message) {
  return {
    id: message.messageId ?? message.id,
    ciphertext: message.ciphertext,
    iv: message.iv,
    sender: message.sender,
    timestamp: message.timestamp,
  };
}

function clientIp(request) {
  const cloudflareIp = request.headers['cf-connecting-ip'];
  if (config.TRUST_CF_CONNECTING_IP && typeof cloudflareIp === 'string' && isIP(cloudflareIp)) {
    return cloudflareIp;
  }
  return request.socket.remoteAddress || 'unknown';
}

async function getOrCreateRoomExpiry(roomId, requestedExpiry) {
  const now = Date.now();
  if (!Number.isSafeInteger(requestedExpiry) || requestedExpiry <= now || requestedExpiry > now + 24 * 60 * 60 * 1000) return null;
  if (rooms) {
    let room = await rooms.findOne({ roomId });
    if (!room) {
      try { await rooms.insertOne({ roomId, expiresAt: new Date(requestedExpiry) }); }
      catch (error) { if (error?.code !== 11000) throw error; }
      room = await rooms.findOne({ roomId });
    }
    if (!room || room.expiresAt.getTime() <= now) return null;
    return room.expiresAt.getTime();
  }
  const existing = localRoomExpiries.get(roomId);
  if (existing !== undefined) return existing > now ? existing : null;
  localRoomExpiries.set(roomId, requestedExpiry);
  return requestedExpiry;
}

async function rateAllowed(key, limit = config.MAX_MESSAGES_PER_WINDOW) {
  if (redis) {
    const count = await redis.eval(
      "local value = redis.call('INCR', KEYS[1]); if value == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return value",
      { keys: [key], arguments: ['10'] },
    );
    return Number(count) <= limit;
  }
  const now = Date.now();
  const current = localRate.get(key);
  if (!current || current.until < now) {
    if (localRate.size >= 10_000) {
      for (const [existingKey, entry] of localRate) {
        if (entry.until >= now) break;
        localRate.delete(existingKey);
      }
      if (localRate.size >= 10_000) return false;
    }
    localRate.set(key, { count: 1, until: now + 10_000 });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}

app.get('/healthz', async (_req, res) => {
  try {
    if (mongo) await mongo.db().command({ ping: 1 });
    if (redis && !(await redis.ping())) throw new Error('redis unavailable');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'degraded' });
  }
});

app.get('/api/rooms/:roomId/messages', async (req, res) => {
  const { roomId } = req.params;
  if (!validRoomId(roomId)) return res.status(400).json({ error: 'invalid_room' });
  let allowed;
  try { allowed = await rateAllowed(`phantom:http:${clientIp(req)}`); }
  catch { return res.status(503).json({ error: 'rate_limit_unavailable' }); }
  if (!allowed) {
    res.set('Retry-After', '10');
    return res.status(429).json({ error: 'rate_limited' });
  }
  const requestedExpiry = Number(req.query.expiresAt);
  try {
    const expiry = rooms
      ? (await rooms.findOne({ roomId }))?.expiresAt.getTime()
      : localRoomExpiries.get(roomId);
    if (!expiry || expiry <= Date.now() || requestedExpiry !== expiry) return res.status(410).json({ error: 'room_expired' });
  } catch { return res.status(503).json({ error: 'room_unavailable' }); }
  const before = Number(req.query.before ?? Date.now() + 1);
  const beforeId = String(req.query.beforeId ?? '\uffff');
  if (!Number.isFinite(before) || beforeId.length > 64) return res.status(400).json({ error: 'invalid_cursor' });
  try {
    if (redis && req.query.before === undefined) {
      try {
        const cached = await redis.get(`phantom:history:${roomId}`);
        if (cached) return res.set('Cache-Control', 'no-store').json(JSON.parse(cached));
      } catch { /* Cache failure falls back to MongoDB. */ }
    }
    const query = { roomId, $or: [
      { createdAt: { $lt: new Date(before) } },
      { createdAt: new Date(before), messageId: { $lt: beforeId } },
    ] };
    const docs = messages
      ? await messages.find(query).sort({ createdAt: -1, messageId: -1 }).limit(100).toArray()
      : (localRooms.get(roomId) ?? [])
        .filter(item => item.createdAt.getTime() < before || (item.createdAt.getTime() === before && item.id < beforeId))
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime() || right.id.localeCompare(left.id))
        .slice(0, 100);
    const chronological = [...docs].reverse();
    const oldest = chronological[0];
    const result = {
      messages: chronological.map(({ _id, expiresAt, ...message }) => message),
      nextCursor: docs.length === 100 && oldest
        ? { before: oldest.createdAt.getTime(), beforeId: oldest.messageId ?? oldest.id }
        : null,
    };
    if (redis && req.query.before === undefined) {
      try { await redis.set(`phantom:history:${roomId}`, JSON.stringify(result), { EX: 15 }); }
      catch { /* Cache failure does not block message history. */ }
    }
    res.set('Cache-Control', 'no-store').json(result);
  } catch {
    res.status(503).json({ error: 'history_unavailable' });
  }
});
app.use((_error, _req, res, _next) => res.status(400).json({ error: 'invalid_request' }));

const server = createServer(app);
const wss = new WebSocketServer({ noServer: true, maxPayload: config.MAX_MESSAGE_BYTES + 2048, perMessageDeflate: false });
const peers = new Map();
const connectionsByIp = new Map();

function broadcastLocal(roomId, packet, except) {
  for (const [socket, meta] of peers) {
    if (meta.roomId === roomId && socket !== except && socket.readyState === WebSocket.OPEN) {
      if (socket.bufferedAmount > 1_048_576) {
        socket.close(1008, 'slow consumer');
        continue;
      }
      socket.send(JSON.stringify({ type: 'message', message: packet }));
    }
  }
}

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const origin = request.headers.origin;
  const requestedExpiry = Number(url.searchParams.get('expiresAt'));
  const peerIp = clientIp(request);
  const currentIpConnections = connectionsByIp.get(peerIp) ?? 0;
  if (url.pathname !== '/ws' || !validRoomId(url.searchParams.get('roomId')) || !Number.isSafeInteger(requestedExpiry)
      || requestedExpiry <= Date.now() || requestedExpiry > Date.now() + 24 * 60 * 60 * 1000 || !originAllowed(origin)
      || peers.size >= config.MAX_CONNECTIONS || currentIpConnections >= config.MAX_CONNECTIONS_PER_IP) {
    socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, ws => wss.emit('connection', ws, request, url.searchParams.get('roomId'), peerIp, requestedExpiry));
});

wss.on('connection', async (ws, _request, roomId, peerIp, requestedExpiry) => {
  let roomExpiry;
  try { roomExpiry = await getOrCreateRoomExpiry(roomId, requestedExpiry); }
  catch { ws.close(1011, 'room unavailable'); return; }
  if (!roomExpiry) { ws.close(1008, 'room expired'); return; }
  const peer = { roomId, alive: true, ip: peerIp, roomExpiry };
  connectionsByIp.set(peerIp, (connectionsByIp.get(peerIp) ?? 0) + 1);
  peers.set(ws, peer);
  ws.send(JSON.stringify({ type: 'ready' }));
  ws.on('pong', () => { peer.alive = true; });
  ws.on('message', async raw => {
    try {
      if (raw.length > config.MAX_MESSAGE_BYTES) return ws.close(1009, 'message too large');
      const parsed = z.object({
        type: z.literal('send'),
        message: z.object({
          id: z.string().uuid(),
          ciphertext: z.string().min(1).max(config.MAX_MESSAGE_BYTES * 2),
          iv: z.string().min(1).max(64),
          sender: z.string().trim().min(1).max(32).regex(/^[\p{L}\p{N} _.-]+$/u),
          timestamp: z.number().int().positive().max(Date.now() + 60_000),
        }).strict(),
      }).strict().safeParse(JSON.parse(raw.toString()));
      if (!parsed.success) return ws.send(JSON.stringify({ type: 'error', code: 'invalid_message' }));
      if (Date.now() >= roomExpiry) return ws.close(1008, 'room expired');
      let allowed;
      try { allowed = await rateAllowed(`phantom:rate:${roomId}:${peer.ip}`); }
      catch {
        ws.send(JSON.stringify({ type: 'error', code: 'rate_limit_unavailable' }));
        return;
      }
      if (!allowed) {
        return ws.send(JSON.stringify({ type: 'error', code: 'rate_limited' }));
      }
      const message = { ...parsed.data.message, roomId, createdAt: new Date(), expiresAt: new Date(Math.min(roomExpiry, Date.now() + config.MESSAGE_TTL_DAYS * 86_400_000)) };
      let packet = messageEnvelope(message);
      try {
        if (messages) {
          const result = await messages.updateOne({ roomId, messageId: message.id }, { $setOnInsert: { ...message, messageId: message.id } }, { upsert: true });
          if (result.matchedCount > 0) {
            const existing = await messages.findOne({ roomId, messageId: message.id });
            if (!existing) return ws.send(JSON.stringify({ type: 'error', code: 'message_not_saved' }));
            packet = messageEnvelope(existing);
          }
        }
        else {
          const room = localRooms.get(roomId) ?? [];
          const existing = room.find(item => item.id === message.id);
          if (existing) packet = messageEnvelope(existing);
          else room.push(message);
          localRooms.set(roomId, room.slice(-1000));
        }
      } catch (error) {
        if (error?.code !== 11000) return ws.send(JSON.stringify({ type: 'error', code: 'message_not_saved' }));
        const existing = await messages.findOne({ roomId, messageId: message.id }).catch(() => null);
        if (!existing) return ws.send(JSON.stringify({ type: 'error', code: 'message_not_saved' }));
        packet = messageEnvelope(existing);
      }
      if (redis) {
        try { await redis.del(`phantom:history:${roomId}`); }
        catch { /* Cached history has a short TTL; cache failure cannot block delivery. */ }
      }
      broadcastLocal(roomId, packet, ws);
      if (publisher) {
        try { await publisher.publish(topic, JSON.stringify({ instanceId, roomId, packet })); }
        catch (error) {
          console.error('redis_publish_failed', { name: error?.name ?? 'Error' });
          ws.send(JSON.stringify({ type: 'error', code: 'fanout_unavailable', id: packet.id }));
          ws.close(1011, 'message fanout unavailable');
          return;
        }
      }
      ws.send(JSON.stringify({ type: 'ack', id: packet.id }));
    } catch {
      ws.send(JSON.stringify({ type: 'error', code: 'invalid_payload' }));
    }
  });
  const removePeer = () => {
    if (!peers.delete(ws)) return;
    const count = (connectionsByIp.get(peerIp) ?? 1) - 1;
    if (count <= 0) connectionsByIp.delete(peerIp);
    else connectionsByIp.set(peerIp, count);
  };
  ws.on('close', removePeer);
  ws.on('error', removePeer);
});

const heartbeat = setInterval(() => {
  for (const [ws, peer] of peers) {
    if (!peer.alive) { ws.terminate(); continue; }
    peer.alive = false;
    ws.ping();
  }
}, 30_000);
const expirySweep = setInterval(() => {
  const now = Date.now();
  for (const [ws, peer] of peers) if (peer.roomExpiry <= now) ws.close(1008, 'room expired');
}, 1_000);
const localCleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of localRate) if (value.until < now) localRate.delete(key);
  for (const [roomId, room] of localRooms) {
    const active = room.filter(item => item.expiresAt.getTime() > now);
    if (active.length) localRooms.set(roomId, active);
    else localRooms.delete(roomId);
  }
  for (const [roomId, expiresAt] of localRoomExpiries) if (expiresAt <= now) localRoomExpiries.delete(roomId);
  while (localRooms.size > 2_000) {
    const oldestRoomId = localRooms.keys().next().value;
    if (!oldestRoomId) break;
    localRooms.delete(oldestRoomId);
  }
}, 60_000);

server.listen(config.PORT, '0.0.0.0', () => console.log('server_listening', { port: config.PORT }));

function shutdown() {
  clearInterval(heartbeat);
  clearInterval(expirySweep);
  clearInterval(localCleanup);
  for (const ws of wss.clients) ws.close(1001, 'server shutdown');
  server.close(async () => {
    await Promise.allSettled([redis?.quit(), publisher?.quit(), subscriber?.quit(), mongo?.close()]);
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
