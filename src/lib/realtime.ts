import type { Message } from '@/types/chat';
import { z } from 'zod';

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'offline';

const configuredApiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
const isDevelopment = process.env.NODE_ENV === 'development';
export const backendConfigured = isDevelopment || Boolean(configuredApiBase);
const apiBase = configuredApiBase ?? (isDevelopment ? 'http://localhost:4000' : '');

export interface HistoryCursor { before: number; beforeId: string; }
export interface HistoryPage { messages: Message[]; nextCursor: HistoryCursor | null; }

const historyMessageSchema = z.object({
  id: z.string().uuid(),
  ciphertext: z.string().min(1),
  iv: z.string().min(1),
  sender: z.string().min(1).max(32),
  timestamp: z.number().int().positive(),
});

const historyPageSchema = z.object({
  messages: z.array(historyMessageSchema),
  nextCursor: z.object({
    before: z.number().int().positive(),
    beforeId: z.string().uuid(),
  }).nullable(),
});

export function websocketUrl(roomId: string, expiresAt: number): string {
  const configured = process.env.NEXT_PUBLIC_WS_URL;
  const base = configured ?? apiBase.replace(/^http/, 'ws');
  return `${base.replace(/\/$/, '')}/ws?roomId=${encodeURIComponent(roomId)}&expiresAt=${expiresAt}`;
}

export async function loadRoomMessages(roomId: string, expiresAt: number, cursor?: HistoryCursor): Promise<HistoryPage> {
  if (!apiBase) throw new Error('Chat backend is not configured');
  const query = new URLSearchParams({ expiresAt: String(expiresAt) });
  if (cursor) {
    query.set('before', String(cursor.before));
    query.set('beforeId', cursor.beforeId);
  }
  const response = await fetch(`${apiBase}/api/rooms/${encodeURIComponent(roomId)}/messages?${query}`, { cache: 'no-store' });
  if (response.status === 410) throw new Error('ROOM_EXPIRED');
  if (!response.ok) throw new Error('Could not restore room history');
  const result = historyPageSchema.safeParse(await response.json());
  if (!result.success) throw new Error('Invalid room history response');
  return result.data;
}

export function encryptForStorage(message: Message): string {
  return JSON.stringify({ id: message.id, ciphertext: message.ciphertext, iv: message.iv, sender: message.sender, timestamp: message.timestamp });
}
