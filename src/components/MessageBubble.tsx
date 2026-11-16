import { LockKeyhole } from 'lucide-react';
import type { Message } from '@/types/chat';

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
    const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <article className={`chat-message${isOwn ? ' own-message' : ''}`}>
            <div className="message-avatar" aria-hidden="true">{message.sender.slice(0, 1).toUpperCase()}</div>
            <div className="message-content">
                <div className="message-heading">
                    <strong>{message.sender}</strong>
                    <time dateTime={new Date(message.timestamp).toISOString()}>{time}</time>
                    <LockKeyhole size={12} aria-label="Encrypted message" />
                </div>
                <p>{message.decryptedContent ?? 'Decrypting message…'}</p>
            </div>
        </article>
    );
}
