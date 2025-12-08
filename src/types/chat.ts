export interface Message {
    id: string;
    ciphertext: string;
    iv: string;
    sender: string;
    timestamp: number;
    decryptedContent?: string;
}
