import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowLeft,
    Clock3,
    Copy,
    Hash,
    LockKeyhole,
    LogOut,
    MessageSquare,
    Search,
    Send,
    ShieldCheck,
    Users,
    Wifi,
    WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageBubble } from './MessageBubble';
import { CountdownTimer } from './CountdownTimer';
import { useCountdown } from '../hooks/useCountdown';
import type { Message } from '../types/chat';
import { decryptMessage, encryptMessage } from '../lib/crypto';
import { backendConfigured, loadRoomMessages, websocketUrl, type ConnectionState, type HistoryCursor } from '../lib/realtime';
import { toast } from 'sonner';

interface ChatRoomProps {
    roomId: string;
    nickname: string;
    cryptoKey: CryptoKey;
    expiresAt: number;
    onLeave: () => void;
}

type MobileTab = 'rooms' | 'chat' | 'members';

const queueKey = (roomId: string) => `phantom_outbox_${roomId}`;
const MAX_PENDING_MESSAGES = 200;

function readQueue(roomId: string): Message[] {
    try {
        const queue = JSON.parse(localStorage.getItem(queueKey(roomId)) ?? '[]') as Message[];
        return Array.isArray(queue) ? queue.filter(item => item
            && typeof item.id === 'string'
            && typeof item.ciphertext === 'string'
            && typeof item.iv === 'string'
            && typeof item.sender === 'string'
            && Number.isSafeInteger(item.timestamp))
            .map(({ id, ciphertext, iv, sender, timestamp }) => ({ id, ciphertext, iv, sender, timestamp }))
            .slice(-MAX_PENDING_MESSAGES) : [];
    } catch {
        return [];
    }
}

function saveQueue(roomId: string, queue: Message[]) {
    const encryptedOnly = queue.map(({ id, ciphertext, iv, sender, timestamp }) => ({ id, ciphertext, iv, sender, timestamp }));
    localStorage.setItem(queueKey(roomId), JSON.stringify(encryptedOnly));
}

export function ChatRoom({ roomId, nickname, cryptoKey, expiresAt, onLeave }: ChatRoomProps) {
    const [mobileTab, setMobileTab] = useState<MobileTab>('chat');
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [searchValue, setSearchValue] = useState('');
    const [connection, setConnection] = useState<ConnectionState>(backendConfigured ? 'connecting' : 'offline');
    const [isSending, setIsSending] = useState(false);
    const [roomUnavailable, setRoomUnavailable] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageScrollRef = useRef<HTMLElement | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const historyCursorRef = useRef<HistoryCursor | null>(null);
    const loadingOlderRef = useRef(false);
    const atBottomRef = useRef(true);
    const scrollAnchorRef = useRef<{ height: number; top: number } | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const retryRef = useRef<number | undefined>(undefined);
    const retryCountRef = useRef(0);
    const unavailableRef = useRef(false);
    const queueRef = useRef<Message[]>(readQueue(roomId));
    const { formattedTime, isExpired, timeLeft } = useCountdown(expiresAt);

    const filteredMessages = useMemo(() => {
        const query = searchValue.trim().toLocaleLowerCase();
        if (!query) return messages;
        return messages.filter(message =>
            message.decryptedContent?.toLocaleLowerCase().includes(query)
            || message.sender.toLocaleLowerCase().includes(query),
        );
    }, [messages, searchValue]);

    useEffect(() => {
        const handleShortcut = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setMobileTab('rooms');
                searchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
    }, []);

    useEffect(() => {
        try {
            saveQueue(roomId, queueRef.current);
        } catch {
            toast.error('Pending messages could not be saved on this device.');
        }
    }, [roomId]);

    const addMessage = useCallback(async (message: Message) => {
        try {
            const aad = `${roomId}:${message.id}:${message.sender}:${message.timestamp}`;
            const decryptedContent = await decryptMessage(message.ciphertext, message.iv, cryptoKey, aad);
            setMessages(previous => previous.some(item => item.id === message.id)
                ? previous.map(item => item.id === message.id ? { ...item, decryptedContent } : item)
                : [...previous, { ...message, decryptedContent }].sort((left, right) => left.timestamp - right.timestamp));
        } catch {
            setMessages(previous => previous.some(item => item.id === message.id)
                ? previous
                : [...previous, { ...message, decryptedContent: '[Unable to decrypt this message]' }].sort((left, right) => left.timestamp - right.timestamp));
        }
    }, [cryptoKey, roomId]);

    const sendQueued = useCallback(() => {
        const socket = socketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) return;
        for (const message of queueRef.current) {
            socket.send(JSON.stringify({
                type: 'send',
                message: {
                    id: message.id,
                    ciphertext: message.ciphertext,
                    iv: message.iv,
                    sender: message.sender,
                    timestamp: message.timestamp,
                },
            }));
        }
    }, []);

    const markRoomUnavailable = useCallback(() => {
        unavailableRef.current = true;
        setRoomUnavailable(true);
        setConnection('offline');
        socketRef.current?.close(1000, 'room unavailable');
    }, []);

    const loadOlderMessages = useCallback(async () => {
        const cursor = historyCursorRef.current;
        const scrollElement = messageScrollRef.current;
        if (!cursor || !scrollElement || loadingOlderRef.current || roomUnavailable) return;
        loadingOlderRef.current = true;
        const previousHeight = scrollElement.scrollHeight;
        const previousTop = scrollElement.scrollTop;
        try {
            const page = await loadRoomMessages(roomId, expiresAt, cursor);
            historyCursorRef.current = page.nextCursor;
            if (page.messages.length === 0) return;
            const older = await Promise.all(page.messages.map(async message => {
                try {
                    const aad = `${roomId}:${message.id}:${message.sender}:${message.timestamp}`;
                    const decryptedContent = await decryptMessage(message.ciphertext, message.iv, cryptoKey, aad);
                    return { ...message, decryptedContent };
                } catch {
                    return { ...message, decryptedContent: '[Unable to decrypt this message]' };
                }
            }));
            scrollAnchorRef.current = { height: previousHeight, top: previousTop };
            setMessages(previous => {
                const known = new Set(previous.map(message => message.id));
                return [...older.filter(message => !known.has(message.id)), ...previous]
                    .sort((left, right) => left.timestamp - right.timestamp);
            });
        } catch (error) {
            if (error instanceof Error && error.message === 'ROOM_EXPIRED') {
                markRoomUnavailable();
                return;
            }
            toast.error('Earlier messages could not be loaded. Try again when you are online.');
        } finally {
            loadingOlderRef.current = false;
        }
    }, [cryptoKey, expiresAt, markRoomUnavailable, roomId, roomUnavailable]);

    const handleMessageScroll = () => {
        const element = messageScrollRef.current;
        if (!element) return;
        atBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
        if (element.scrollTop < 50) void loadOlderMessages();
    };

    useEffect(() => {
        let stopped = false;
        unavailableRef.current = false;
        setRoomUnavailable(false);
        if (!backendConfigured) {
            for (const message of queueRef.current) void addMessage(message);
            return () => { stopped = true; };
        }

        const refreshHistory = () => {
            void loadRoomMessages(roomId, expiresAt).then(page => {
                if (stopped) return;
                historyCursorRef.current = page.nextCursor;
                for (const message of page.messages) void addMessage(message);
            }).catch(error => {
                if (stopped) return;
                if (error instanceof Error && error.message === 'ROOM_EXPIRED') {
                    markRoomUnavailable();
                } else {
                    toast.error('Message history could not be restored. Pending messages remain on this device.');
                }
            });
        };

        const connect = () => {
            if (stopped || unavailableRef.current) return;
            setConnection(retryCountRef.current ? 'reconnecting' : 'connecting');
            const socket = new WebSocket(websocketUrl(roomId, expiresAt));
            socketRef.current = socket;
            socket.onopen = () => {
                if (stopped) return socket.close();
                retryCountRef.current = 0;
                setConnection('connected');
            };
            socket.onmessage = event => {
                try {
                    const packet = JSON.parse(String(event.data)) as { type: string; message?: Message; id?: string; code?: string };
                    if (packet.type === 'ready') {
                        sendQueued();
                        refreshHistory();
                    }
                    if (packet.type === 'message' && packet.message) void addMessage(packet.message);
                    if (packet.type === 'ack' && packet.id) {
                        queueRef.current = queueRef.current.filter(item => item.id !== packet.id);
                        try {
                            saveQueue(roomId, queueRef.current);
                        } catch {
                            toast.error('A delivered message could not be removed from this device’s pending queue.');
                        }
                    }
                    if (packet.type === 'error' && packet.code === 'rate_limited') {
                        toast.error('You are sending messages too quickly. Try again in a moment.');
                    }
                } catch {
                    toast.error('The chat service sent a message this app could not read.');
                }
            };
            socket.onclose = () => {
                if (socketRef.current === socket) socketRef.current = null;
                if (stopped || unavailableRef.current) return;
                retryCountRef.current += 1;
                setConnection(navigator.onLine ? 'reconnecting' : 'offline');
                const delay = Math.min(30_000, 500 * 2 ** Math.min(retryCountRef.current, 6)) * (0.8 + Math.random() * 0.4);
                retryRef.current = window.setTimeout(connect, delay);
            };
            socket.onerror = () => socket.close();
        };

        for (const message of queueRef.current) void addMessage(message);
        connect();
        const online = () => {
            const state = socketRef.current?.readyState;
            if (state !== WebSocket.OPEN && state !== WebSocket.CONNECTING) connect();
        };
        window.addEventListener('online', online);
        return () => {
            stopped = true;
            window.removeEventListener('online', online);
            if (retryRef.current) window.clearTimeout(retryRef.current);
            socketRef.current?.close(1000, 'leaving room');
        };
    }, [addMessage, expiresAt, markRoomUnavailable, roomId, sendQueued]);

    useLayoutEffect(() => {
        const element = messageScrollRef.current;
        const anchor = scrollAnchorRef.current;
        if (element && anchor) {
            element.scrollTop = element.scrollHeight - anchor.height + anchor.top;
            scrollAnchorRef.current = null;
        } else if (atBottomRef.current && !searchValue) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, searchValue]);

    useEffect(() => {
        if (!isExpired) return;
        socketRef.current?.close(1000, 'room expired');
        localStorage.removeItem(queueKey(roomId));
        queueRef.current = [];
        onLeave();
    }, [isExpired, onLeave, roomId]);

    const handleSendMessage = async () => {
        const content = inputValue.trim();
        if (!content || isExpired || isSending || roomUnavailable) return;
        if (queueRef.current.length >= MAX_PENDING_MESSAGES) {
            toast.error('Your offline message queue is full. Reconnect before sending more.');
            return;
        }
        setIsSending(true);
        try {
            const id = crypto.randomUUID();
            const timestamp = Date.now();
            const aad = `${roomId}:${id}:${nickname}:${timestamp}`;
            const { ciphertext, iv } = await encryptMessage(content, cryptoKey, aad);
            const message: Message = { id, ciphertext, iv, sender: nickname, timestamp, decryptedContent: content };
            const nextQueue = [...queueRef.current, message];
            saveQueue(roomId, nextQueue);
            queueRef.current = nextQueue;
            setMessages(previous => [...previous, message]);
            setInputValue('');
            sendQueued();
        } catch {
            toast.error('Message could not be encrypted and saved on this device. Nothing was sent.');
        } finally {
            setIsSending(false);
        }
    };

    const copyInvite = async () => {
        const invite = sessionStorage.getItem(`phantom_link_${roomId}`);
        if (!invite) {
            toast.error('This invite is no longer available in this tab. Create a new room to share another link.');
            return;
        }
        let inviteUrl: URL;
        try {
            inviteUrl = new URL(invite);
        } catch {
            toast.error('The saved invite is invalid. Ask for a fresh invite.');
            return;
        }
        const inviteKey = new URLSearchParams(inviteUrl.hash.slice(1)).get('key');
        if (inviteUrl.origin !== window.location.origin
            || inviteUrl.searchParams.get('room') !== roomId
            || inviteUrl.searchParams.get('expiresAt') !== String(expiresAt)
            || !inviteKey) {
            toast.error('This saved invite does not match the current room. Ask for a fresh invite.');
            return;
        }
        try {
            await navigator.clipboard.writeText(inviteUrl.href);
            toast.success('Private invite copied. Anyone with this link can read the room.');
        } catch {
            toast.error('Clipboard access is unavailable in this browser.');
        }
    };

    const statusText = roomUnavailable
        ? 'Invite expired'
        : connection === 'connected'
            ? 'Connected'
            : connection === 'offline'
                ? 'Offline · saved on this device'
                : connection === 'reconnecting'
                    ? 'Reconnecting…'
                    : 'Connecting…';
    const lastMessage = messages.at(-1);

    return (
        <>
            <div className={`chat-shell mobile-tab-${mobileTab}`}>
                <aside className="chat-sidebar" aria-label="Room navigation">
                    <a className="workspace-switch" href="/" aria-label="Back to Phantom home">
                        <span className="brand-s">P</span><span>phantom.</span>
                    </a>
                    <label className="room-search">
                        <Search size={16} aria-hidden="true" />
                        <input
                            ref={searchRef}
                            value={searchValue}
                            onChange={event => setSearchValue(event.target.value)}
                            placeholder="Search messages"
                            aria-label="Search loaded messages"
                        />
                        <kbd>⌘K</kbd>
                    </label>
                    <div className="sidebar-section">
                        <div className="sidebar-label">YOUR ROOM</div>
                        <div className="channel-row active" aria-current="page">
                            <span className="room-avatar"><Hash size={17} /></span>
                            <span className="room-list-copy"><strong>Private room</strong><small>{lastMessage?.decryptedContent ?? `Room ${roomId.slice(0, 8)}`}</small></span>
                            <span className="room-list-time">{lastMessage ? new Date(lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                    </div>
                    <div className="sidebar-bottom">
                        <div className="user-card">
                            <div className="user-avatar">{nickname.slice(0, 1).toUpperCase()}</div>
                            <div className="user-meta"><strong>{nickname}</strong><span>{statusText}</span></div>
                            <button type="button" aria-label="Copy private room invite" onClick={() => void copyInvite()} className="icon-button"><Copy size={17} /></button>
                        </div>
                    </div>
                </aside>

                <main className="chat-main">
                    <header className="chat-topbar">
                        <div className="chat-title">
                            <button type="button" className="mobile-back icon-button" onClick={() => setMobileTab('rooms')} aria-label="Show room navigation"><ArrowLeft size={18} /></button>
                            <Hash size={19} aria-hidden="true" />
                            <strong>Private room</strong>
                            <span className="topbar-divider" />
                            <span className="room-id-label">Room {roomId.slice(0, 8)}</span>
                        </div>
                        <div className="chat-actions">
                            <div className={`connection-pill ${roomUnavailable ? 'offline' : connection}`} role="status">
                                {connection === 'connected' && !roomUnavailable ? <Wifi size={14} /> : <WifiOff size={14} />}
                                <span>{statusText}</span>
                            </div>
                            <div className="encryption-status" title="Messages are encrypted in your browser with the invite's shared key">
                                <LockKeyhole size={15} /><span>Encrypted in this browser</span>
                            </div>
                            <CountdownTimer formattedTime={formattedTime} isExpired={isExpired} timeLeft={timeLeft} />
                            <button type="button" className="copy-invite-action" onClick={() => void copyInvite()}><Copy size={15} /><span>Copy invite</span></button>
                            <button type="button" aria-label="Leave room" onClick={onLeave} className="icon-button leave-button"><LogOut size={18} /></button>
                        </div>
                    </header>

                    <section ref={messageScrollRef} onScroll={handleMessageScroll} className="message-scroll" aria-label="Messages">
                        {roomUnavailable ? (
                            <div className="room-expired-state" role="status">
                                <div className="empty-state-icon"><Clock3 size={23} /></div>
                                <h1>This invite expired.</h1>
                                <p>Ask the room creator for a new invite to start another conversation.</p>
                                <Button variant="secondary" onClick={onLeave}>Back to Phantom</Button>
                            </div>
                        ) : (
                            <>
                                {messages.length === 0 && (
                                    <div className="channel-intro">
                                        <div className="intro-icon"><LockKeyhole size={23} /></div>
                                        <p className="section-eyebrow">PRIVATE ROOM</p>
                                        <h1>A quieter place to talk.</h1>
                                        <p>Messages you send here are encrypted in your browser before they are sent.</p>
                                        <p className="invite-reminder">Invite access is shared: anyone with the private link can join and read this room.</p>
                                        <button type="button" className="inline-invite-button" onClick={() => void copyInvite()}><Copy size={15} /> Copy private invite</button>
                                    </div>
                                )}
                                {connection !== 'connected' && (
                                    <div className="connection-help" role="status">
                                        {!backendConfigured
                                            ? 'The chat service is not configured for this deployment. Messages will stay on this device until a service is available.'
                                            : connection === 'offline'
                                                ? 'You are offline. Encrypted messages stay on this device and will send when you reconnect.'
                                                : 'The chat server is reconnecting. Encrypted messages stay on this device while Phantom tries again.'}
                                    </div>
                                )}
                                <div className="message-list" aria-live="polite">
                                    {filteredMessages.map((message, index) => {
                                        const currentDate = new Date(message.timestamp);
                                        const previousDate = index > 0 ? new Date(filteredMessages[index - 1].timestamp) : null;
                                        const startsNewDay = !previousDate
                                            || currentDate.toDateString() !== previousDate.toDateString();
                                        return (
                                            <div key={message.id}>
                                                {startsNewDay && (
                                                    <div className="date-divider">
                                                        <span>{currentDate.toLocaleDateString([], { dateStyle: 'medium' })}</span>
                                                    </div>
                                                )}
                                                <MessageBubble message={message} isOwn={message.sender === nickname} />
                                            </div>
                                        );
                                    })}
                                    {searchValue && filteredMessages.length === 0 && (
                                        <p className="search-empty">No loaded messages match “{searchValue}”.</p>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            </>
                        )}
                    </section>

                    <footer className="composer-area">
                        {isExpired || roomUnavailable ? (
                            <div className="expired-note"><LockKeyhole size={16} /> This room is no longer accepting messages.</div>
                        ) : (
                            <form className="message-composer" onSubmit={event => { event.preventDefault(); void handleSendMessage(); }}>
                                <Textarea
                                    value={inputValue}
                                    onChange={event => setInputValue(event.target.value)}
                                    onKeyDown={event => {
                                        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                                            event.preventDefault();
                                            void handleSendMessage();
                                        }
                                    }}
                                    placeholder="Write a message…"
                                    disabled={isSending}
                                    maxLength={4000}
                                    aria-label="Write a message"
                                    rows={1}
                                />
                                <div className="composer-tools">
                                    <span><ShieldCheck size={14} /> Encrypted before sending <span className="composer-hint">· Shift + Enter for a new line</span></span>
                                    <Button type="submit" className="send-button" disabled={!inputValue.trim() || isSending} aria-label="Send message">
                                        <Send size={17} />
                                    </Button>
                                </div>
                            </form>
                        )}
                    </footer>
                </main>

                <aside className="details-sidebar" aria-label="Room details">
                    <div className="details-heading"><h2>Room details</h2></div>
                    <div className="member-group">YOU</div>
                    <div className="member-row"><span className="member-avatar">{nickname.slice(0, 1).toUpperCase()}</span><strong>{nickname}</strong><span className="member-you">YOU</span></div>
                    <div className="details-note"><Users size={16} /><p>Participants are not verified by accounts. Anyone with the invite link can join this room.</p></div>
                    <div className="details-security">
                        <div className="details-security-icon"><LockKeyhole size={17} /></div>
                        <h3>Shared-link encryption</h3>
                        <p>The invite contains the room key. Keep it private. This room does not verify who holds the link.</p>
                    </div>
                    <button type="button" className="details-copy-button" onClick={() => void copyInvite()}><Copy size={15} /> Copy room invite</button>
                    <div className="details-expiry"><Clock3 size={15} /><span>Room closes in</span><strong>{formattedTime}</strong></div>
                </aside>

                <nav className="mobile-chat-tabs" aria-label="Chat sections">
                    <button className={mobileTab === 'rooms' ? 'selected' : ''} onClick={() => setMobileTab('rooms')}><Hash size={17} /> Room</button>
                    <button className={mobileTab === 'chat' ? 'selected' : ''} onClick={() => setMobileTab('chat')}><MessageSquare size={17} /> Chat</button>
                    <button className={mobileTab === 'members' ? 'selected' : ''} onClick={() => setMobileTab('members')}><Users size={17} /> Details</button>
                </nav>
            </div>
        </>
    );
}
