import { motion } from 'framer-motion';
import { Lock, Clock } from 'lucide-react';
import type { Message } from '@/types/chat';

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
    const time = new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
        >
            <div
                className={`max-w-[80%] md:max-w-[60%] rounded-2xl px-4 py-3 ${isOwn
                        ? 'bg-primary/20 border border-primary/30 rounded-br-md'
                        : 'bg-secondary border border-border rounded-bl-md'
                    }`}
            >
                {/* Sender name */}
                <div className={`text-xs font-mono mb-1 ${isOwn ? 'text-primary' : 'text-muted-foreground'}`}>
                    {message.sender}
                </div>

                {/* Message content */}
                <p className="text-foreground break-words">
                    {message.decryptedContent || (
                        <span className="text-muted-foreground italic flex items-center gap-2">
                            <Lock className="w-3 h-3" />
                            Decrypting...
                        </span>
                    )}
                </p>

                {/* Timestamp and encryption indicator */}
                <div className={`flex items-center gap-2 mt-2 text-xs ${isOwn ? 'text-primary/60' : 'text-muted-foreground/60'}`}>
                    <Clock className="w-3 h-3" />
                    <span className="font-mono">{time}</span>
                    <Lock className="w-3 h-3 ml-auto" />
                </div>
            </div>
        </motion.div>
    );
}
