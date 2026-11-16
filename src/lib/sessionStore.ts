export interface StoredSession {
  roomId: string;
  cryptoKey: CryptoKey;
  nickname: string;
  expiresAt: number;
}

const DATABASE_NAME = 'phantom-chat-local';
const STORE_NAME = 'sessions';
const SESSION_ID = 'active';

function openStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSession(session: StoredSession): Promise<void> {
  const database = await openStore();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(session, SESSION_ID);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { database.close(); }
}

export async function loadSession(): Promise<StoredSession | undefined> {
  const database = await openStore();
  try {
    return await new Promise<StoredSession | undefined>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(SESSION_ID);
      request.onsuccess = () => resolve(request.result as StoredSession | undefined);
      request.onerror = () => reject(request.error);
    });
  } finally { database.close(); }
}

export async function clearSession(): Promise<void> {
  const database = await openStore();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(SESSION_ID);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { database.close(); }
}
