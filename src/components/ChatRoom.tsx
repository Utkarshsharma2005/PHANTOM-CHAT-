import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Lock, Copy, Check, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageBubble } from './MessageBubble';
import { CountdownTimer } from './CountdownTimer';
import { SecurityWarning } from './SecurityWarning';
import { useScreenSecurity } from '../hooks/useScreenSecurity';
import { useCountdown } from '../hooks/useCountdown';
import type { Message } from '../types/chat';
import { encryptMessage } from '../lib/crypto';
import { toast } from 'sonner';

interface ChatRoomProps {
    roomId: string;
    nickname: string;
    cryptoKey: CryptoKey;
    expiresAt: number;
    onLeave: () => void;
}

export function ChatRoom({ roomId, nickname, cryptoKey, expiresAt, onLeave }: ChatRoomProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [copied, setCopied] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { isBlurred, warningCount } = useScreenSecurity();
    const { formattedTime, isExpired, timeLeft } = useCountdown(expiresAt);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isExpired || isSending) return;

        setIsSending(true);
        try {
            const { ciphertext, iv } = await encryptMessage(inputValue, cryptoKey);

            const newMessage: Message = {
                id: crypto.randomUUID(),
                ciphertext,
                iv,
                sender: nickname,
                timestamp: Date.now(),
                decryptedContent: inputValue,
            };

            setMessages(prev => [...prev, newMessage]);
            setInputValue('');
        } catch (error) {
            toast.error('Failed to encrypt message');
            console.error('Encryption error:', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            toast.success('Secure link copied!');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Failed to copy link');
        }
    };

    return (
        <>
            <SecurityWarning isVisible={isBlurred} warningCount={warningCount} />

            <div className="flex flex-col h-screen bg-background bg-grid-pattern">
                {/* Header */}
                <motion.header
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                            <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="font-mono text-sm text-primary tracking-wider">SECURE ROOM</h1>
                            <p className="text-xs text-muted-foreground font-mono truncate max-w-[150px] md:max-w-none">
                                {roomId.slice(0, 8)}...
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <CountdownTimer
                            formattedTime={formattedTime}
                            isExpired={isExpired}
                            timeLeft={timeLeft}
                        />

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleCopyLink}
                            className="hidden md:flex"
                        >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onLeave}
                            className="text-destructive hover:text-destructive"
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </motion.header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center h-full text-center"
                        >
                            <div className="p-4 rounded-full bg-primary/10 border border-primary/30 mb-4">
                                <Lock className="w-8 h-8 text-primary" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-2">
                                End-to-End Encrypted
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-md">
                                Messages are encrypted with AES-256-GCM.
                                Share the secure link to start chatting.
                            </p>
                        </motion.div>
                    )}

                    {messages.map((message) => (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            isOwn={message.sender === nickname}
                        />
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="p-4 border-t border-border bg-card/50 backdrop-blur-sm"
                >
                    {isExpired ? (
                        <div className="flex items-center justify-center gap-2 py-3 text-destructive font-mono">
                            <Lock className="w-4 h-4" />
                            <span>SESSION EXPIRED - Messages destroyed</span>
                        </div>
                    ) : (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSendMessage();
                            }}
                            className="flex gap-3"
                        >
                            <Input
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Type your encrypted message..."
                                disabled={isSending}
                                className="flex-1"
                            />
                            <Button
                                type="submit"
                                variant="glow"
                                disabled={!inputValue.trim() || isSending}
                            >
                                <Send className="w-4 h-4" />
                                <span className="hidden md:inline">Send</span>
                            </Button>
                        </form>
                    )}
                </motion.div>
            </div>
        </>
    );
}
