import { useEffect, useRef, useState } from 'react';
import {
    ArrowRight,
    Check,
    Clock3,
    Link2,
    LockKeyhole,
    MessageCircle,
    ShieldCheck,
    Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateKey, keyToBase64, generateRoomId, base64ToKey } from '../lib/crypto';
import { toast } from 'sonner';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

interface HomeViewProps {
    onCreateRoom: (roomId: string, key: CryptoKey, nickname: string, expiresAt: number) => void | Promise<void>;
    onJoinRoom: (roomId: string, key: CryptoKey, nickname: string, expiresAt: number) => void | Promise<void>;
    autoJoinLink?: string;
}

const DURATION_OPTIONS = [
    { label: '05m', value: 5 },
    { label: '15m', value: 15 },
    { label: '30m', value: 30 },
    { label: '01h', value: 60 },
];

const steps = [
    { number: '01', title: 'Choose your name', description: 'No account or profile to create.', icon: Users },
    { number: '02', title: 'Create and invite', description: 'Share a private link with the people you choose.', icon: Link2 },
    { number: '03', title: 'Talk in real time', description: 'Messages are encrypted in your browser.', icon: MessageCircle },
    { number: '04', title: 'Room closes', description: 'The room expires when its timer ends.', icon: Clock3 },
];

export function HomeView({ onCreateRoom, onJoinRoom, autoJoinLink }: HomeViewProps) {
    const heroCopyRef = useRef<HTMLDivElement>(null);
    const [nickname, setNickname] = useState('');
    const [duration, setDuration] = useState(15);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [joinLink, setJoinLink] = useState(autoJoinLink ?? '');

    useEffect(() => {
        if (autoJoinLink) setJoinLink(autoJoinLink);
    }, [autoJoinLink]);

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !heroCopyRef.current) return;
        gsap.registerPlugin(ScrollTrigger);
        const context = gsap.context(() => {
            gsap.fromTo(
                '.hero-copy > *',
                { autoAlpha: 0, y: 16 },
                {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.55,
                    stagger: 0.07,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: heroCopyRef.current,
                        start: 'top 82%',
                        once: true,
                    },
                },
            );
        }, heroCopyRef);
        return () => context.revert();
    }, []);

    const validateName = () => {
        const displayName = nickname.trim();
        if (!/^[\p{L}\p{N} _.-]{1,32}$/u.test(displayName)) {
            toast.error('Enter a name using up to 32 letters, numbers, spaces, periods, underscores, or hyphens.');
            return null;
        }
        return displayName;
    };

    const handleCreateRoom = async () => {
        const displayName = validateName();
        if (!displayName) return;
        setIsSubmitting(true);
        try {
            const key = await generateKey();
            const keyBase64 = await keyToBase64(key);
            const roomId = generateRoomId();
            const expiresAt = Date.now() + duration * 60 * 1000;
            const invite = `${window.location.origin}/?room=${roomId}&expiresAt=${expiresAt}#key=${encodeURIComponent(keyBase64)}`;

            sessionStorage.setItem(`phantom_link_${roomId}`, invite);
            window.history.replaceState({}, '', `/?room=${roomId}`);
            await onCreateRoom(roomId, key, displayName, expiresAt);
            try {
                await navigator.clipboard.writeText(invite);
                toast.success('Private invite copied. Share it only with people you trust.');
            } catch {
                toast.info('Room created. Use Copy invite in the room to share the private link.');
            }
        } catch {
            toast.error('The room could not be created. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleJoinRoom = async () => {
        const displayName = validateName();
        if (!displayName) return;
        if (!joinLink.trim()) {
            toast.error('Paste a room invite to continue.');
            return;
        }

        setIsSubmitting(true);
        try {
            const url = new URL(joinLink.trim(), window.location.origin);
            const roomId = url.searchParams.get('room');
            const keyBase64 = new URLSearchParams(url.hash.slice(1)).get('key');
            const expiryParam = url.searchParams.get('expiresAt');
            const requestedExpiry = expiryParam === null ? undefined : Number(expiryParam);
            if (url.origin !== window.location.origin || url.pathname !== '/'
                || !roomId || !/^[0-9a-f-]{36}$/i.test(roomId) || !keyBase64) {
                toast.error('This invite is incomplete. Ask the room creator for a new link.');
                return;
            }
            if (requestedExpiry !== undefined && (!Number.isSafeInteger(requestedExpiry) || requestedExpiry <= Date.now())) {
                toast.error('This invite expired. Ask the room creator for a new one.');
                return;
            }

            const key = await base64ToKey(keyBase64);
            const expiresAt = requestedExpiry ?? Date.now() + 15 * 60 * 1000;
            sessionStorage.setItem(`phantom_link_${roomId}`, url.href);
            window.history.replaceState({}, '', `/?room=${roomId}`);
            await onJoinRoom(roomId, key, displayName, expiresAt);
        } catch {
            toast.error('This invite could not be opened. Check the link and try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="landing-page">
            <header className="landing-nav">
                <a className="brand-lockup" href="/" aria-label="Phantom home">
                    <span className="brand-symbol">P</span>
                    <span>phantom<span className="brand-period">.</span></span>
                </a>
                <nav aria-label="Main navigation" className="landing-nav-links">
                    <a href="#how-it-works">How it works</a>
                    <a href="#start">Create or join</a>
                </nav>
                <a className="nav-link" href="#start">Enter a room <ArrowRight size={16} /></a>
            </header>

            <section className="landing-hero">
                <div className="hero-copy" ref={heroCopyRef}>
                    <p className="hero-kicker">MADE FOR YOUR PEOPLE <span aria-hidden="true">·</span> NO ACCOUNT REQUIRED</p>
                    <h1 className="hero-title">A quieter place<br />to talk.</h1>
                    <p className="hero-description">
                        Invite-only rooms for real-time conversations. Messages are encrypted in your browser, and the room closes when its timer ends.
                    </p>
                    <div className="hero-actions">
                        <a className="hero-cta" href="#start">Start a private room <ArrowRight size={17} /></a>
                        <a className="hero-secondary" href="#start">Enter a room</a>
                    </div>
                    <div className="hero-proof"><LockKeyhole size={15} /><span>Encrypted on your device. Shared by invitation.</span></div>
                </div>

                <div className="hero-visual">
                    <div className="preview-label">A ROOM, AT A GLANCE <span>ILLUSTRATIVE PREVIEW</span></div>
                    <div className="preview-window" aria-label="Illustrative preview of the chat interface">
                        <div className="preview-chrome"><i /><i /><i /><span>phantom · private room</span></div>
                        <div className="preview-app">
                            <aside className="preview-rooms">
                                <b><span className="preview-mark">P</span> phantom.</b>
                                <small>YOUR ROOM</small>
                                <div className="preview-room-active"><span /> Private room</div>
                                <div className="preview-user"><span>Y</span><div><b>Your name</b><small>In this room</small></div></div>
                            </aside>
                            <div className="preview-chat">
                                <header><div><b>Private room</b><small><LockKeyhole size={11} /> Encrypted in this browser</small></div><span>15:00</span></header>
                                <div className="preview-messages">
                                    <div className="preview-date"><span>Today</span></div>
                                    <div className="preview-message"><i>M</i><div><b>Morgan <small>10:42</small></b><p>Made it. Thanks for the invite.</p></div></div>
                                    <div className="preview-message"><i>J</i><div><b>Jordan <small>10:43</small></b><p>Good to see you here.</p></div></div>
                                    <div className="preview-message preview-own"><i>Y</i><div><b>You <small>10:44</small></b><p>Let’s get started.</p></div></div>
                                </div>
                                <div className="preview-composer"><span>Write a message…</span><b><ArrowRight size={13} /></b></div>
                            </div>
                        </div>
                    </div>
                    <p className="preview-caption">A focused space for the conversation in front of you.</p>
                </div>
            </section>

            <section id="how-it-works" className="steps-section">
                <div className="section-heading">
                    <p className="section-eyebrow">HOW IT WORKS</p>
                    <h2>Private by design.<br />Simple by nature.</h2>
                </div>
                <div className="steps-timeline">
                    {steps.map(({ number, title, description, icon: Icon }) => (
                        <article className="step-item" key={number}>
                            <div className="step-icon"><Icon size={22} strokeWidth={1.7} /></div>
                            <p className="step-number">{number}</p>
                            <h3>{title}</h3>
                            <p>{description}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section id="start" className="start-section">
                <div className="section-heading start-heading">
                    <p className="section-eyebrow">START A CONVERSATION</p>
                    <h2>Make it a private room.</h2>
                    <p>Choose a name, create a room, and share its invite with the people you trust.</p>
                </div>
                <div className="room-name-field">
                    <label htmlFor="display-name">YOUR NAME</label>
                    <Input
                        id="display-name"
                        placeholder="What should we call you?"
                        value={nickname}
                        onChange={event => setNickname(event.target.value)}
                        maxLength={32}
                        autoComplete="nickname"
                    />
                </div>
                <div className="room-actions">
                    <article className="room-action-card">
                        <div className="card-heading"><div className="card-icon"><MessageCircle size={20} /></div><span>CREATE A ROOM</span></div>
                        <h3>A room for your people.</h3>
                        <p>Set how long it stays open. Anyone with the invite link can join and read messages.</p>
                        <div className="duration-control" aria-label="Room duration">
                            {DURATION_OPTIONS.map(option => (
                                <button
                                    type="button"
                                    key={option.value}
                                    aria-pressed={duration === option.value}
                                    onClick={() => setDuration(option.value)}
                                >{option.label}</button>
                            ))}
                        </div>
                        <Button className="room-submit" onClick={() => void handleCreateRoom()} disabled={isSubmitting || !nickname.trim()}>
                            {isSubmitting ? 'Creating room…' : 'Create private room'} <ArrowRight size={17} />
                        </Button>
                        <p className="card-footnote"><Clock3 size={14} /> Expires after {DURATION_OPTIONS.find(item => item.value === duration)?.label}</p>
                    </article>

                    <article className="room-action-card">
                        <div className="card-heading"><div className="card-icon"><Link2 size={20} /></div><span>JOIN A ROOM</span></div>
                        <h3>You have an invite.</h3>
                        <p>Paste the private invite you received. The link contains the key needed to decrypt messages.</p>
                        <div className="invite-input-wrap">
                            <Link2 size={17} aria-hidden="true" />
                            <Input
                                aria-label="Room invite"
                                placeholder="Paste your private invite"
                                value={joinLink}
                                onChange={event => setJoinLink(event.target.value)}
                                autoComplete="url"
                                inputMode="url"
                            />
                        </div>
                        <Button variant="secondary" className="room-submit" onClick={() => void handleJoinRoom()} disabled={isSubmitting || !nickname.trim() || !joinLink.trim()}>
                            {isSubmitting ? 'Joining room…' : 'Join conversation'} <ArrowRight size={17} />
                        </Button>
                        <p className="card-footnote"><ShieldCheck size={14} /> Treat invite links like private keys</p>
                    </article>
                </div>
            </section>

            <footer className="landing-footer">
                <a className="brand-lockup" href="/" aria-label="Phantom home"><span className="brand-symbol">P</span><span>phantom<span className="brand-period">.</span></span></a>
                <p>Less noise. More meaning.</p>
                <div className="footer-trust"><span><Check size={13} /> No account</span><span><Check size={13} /> No tracking</span><span><LockKeyhole size={13} /> Browser-side encryption</span></div>
            </footer>
        </main>
    );
}
