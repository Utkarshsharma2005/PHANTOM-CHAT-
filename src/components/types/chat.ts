export interface Message {
  id: string;
  ciphertext: string;
  iv: string;
  sender: string;
  timestamp: number;
  decryptedContent?: string;
}

export interface Room {
  id: string;
  createdAt: number;
  expiresAt: number;
  status: 'open' | 'expired';
}

export interface ChatState {
  roomId: string | null;
  nickname: string;
  messages: Message[];
  isConnected: boolean;
  isExpired: boolean;
}
