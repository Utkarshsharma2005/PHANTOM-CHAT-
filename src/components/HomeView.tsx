import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Timer, Eye, ArrowRight, Link2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateKey, keyToBase64, generateRoomId, base64ToKey } from "../lib/crypto";
import { toast } from 'sonner';

interface HomeViewProps {
    onCreateRoom: (roomId: string, key: CryptoKey, nickname: string, expiresAt: number) => void;
    onJoinRoom: (roomId: string, key: CryptoKey, nickname: string, expiresAt: number) => void;
}

const DURATION_OPTIONS = [
    { label: '5 min', value: 5 },
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
    { label: '1 hour', value: 60 },
];

export function HomeView({ onCreateRoom, onJoinRoom }: HomeViewProps) {
    const [nickname, setNickname] = useState('');
    const [duration, setDuration] = useState(15);
    const [isCreating, setIsCreating] = useState(false);
    const [joinLink, setJoinLink] = useState('');

    const handleCreateRoom = async () => {
        if (!nickname.trim()) {
            toast.error('Please enter a nickname');
            return;
        }

        setIsCreating(true);
        try {
            const key = await generateKey();
            const keyBase64 = await keyToBase64(key);
            const roomId = generateRoomId();
            const expiresAt = Date.now() + duration * 60 * 1000;

            // Create shareable link
            const shareUrl = `${window.location.origin}?room=${roomId}&key=${encodeURIComponent(keyBase64)}`;

            // Copy to clipboard
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Secure link copied to clipboard!');

            // Update URL without key for security
            window.history.replaceState({}, '', `?room=${roomId}`);

            onCreateRoom(roomId, key, nickname, expiresAt);
        } catch (error) {
            toast.error('Failed to create room');
            console.error(error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoinRoom = async () => {
        if (!nickname.trim()) {
            toast.error('Please enter a nickname');
            return;
        }

        if (!joinLink.trim()) {
            toast.error('Please enter a room link');
            return;
        }

        try {
            const url = new URL(joinLink);
            const roomId = url.searchParams.get('room');
            const keyBase64 = url.searchParams.get('key');

            if (!roomId || !keyBase64) {
                toast.error('Invalid room link');
                return;
            }

            const key = await base64ToKey(keyBase64);
            const expiresAt = Date.now() + 15 * 60 * 1000; // Default 15 min for joining

            // Clean URL
            window.history.replaceState({}, '', `?room=${roomId}`);

            onJoinRoom(roomId, key, nickname, expiresAt);
        } catch (error) {
            toast.error('Invalid room link');
            console.error(error);
        }
    };

    const features = [
        { icon: Lock, title: 'E2E Encrypted', desc: 'AES-256-GCM encryption' },
        { icon: Timer, title: 'Self-Destruct', desc: 'Auto-delete messages' },
        { icon: Eye, title: 'No Tracking', desc: 'Complete anonymity' },
        { icon: Shield, title: 'Zero Knowledge', desc: 'Keys never leave you' },
    ];

    return (
        <div className="min-h-screen bg-background bg-grid-pattern flex flex-col">
            {/* Hero Section */}
            <div className="flex-1 flex flex-col items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="inline-flex p-4 rounded-2xl bg-primary/10 border border-primary/30 mb-6 glow-primary"
                    >
                        <Shield className="w-12 h-12 text-primary" />
                    </motion.div>

                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 font-mono">
                        <span className="text-primary text-glow">PHANTOM</span>
                        <span className="text-muted-foreground">CHAT</span>
                    </h1>

                    <p className="text-muted-foreground max-w-md mx-auto text-lg">
                        Anonymous, encrypted, ephemeral messaging.
                        <br />
                        <span className="text-primary font-mono text-sm">No traces. No history. No compromise.</span>
                    </p>
                </motion.div>

                {/* Features */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-3xl w-full"
                >
                    {features.map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + i * 0.1 }}
                            className="p-4 rounded-xl bg-card/50 border border-border hover:border-primary/50 transition-all duration-300 text-center"
                        >
                            <feature.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                            <h3 className="text-sm font-medium text-foreground">{feature.title}</h3>
                            <p className="text-xs text-muted-foreground">{feature.desc}</p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Action Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="grid md:grid-cols-2 gap-6 max-w-2xl w-full"
                >
                    {/* Create Room */}
                    <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
                        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <Shield className="w-5 h-5 text-primary" />
                            Create Secure Room
                        </h2>

                        <Input
                            placeholder="Your anonymous nickname..."
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                        />

                        <div className="space-y-2">
                            <label className="text-sm text-muted-foreground flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Self-destruct timer
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {DURATION_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setDuration(opt.value)}
                                        className={`py-2 px-3 rounded-lg text-sm font-mono transition-all ${duration === opt.value
                                            ? 'bg-primary text-primary-foreground glow-primary'
                                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <Button
                            variant="glow"
                            className="w-full"
                            size="lg"
                            onClick={handleCreateRoom}
                            disabled={isCreating || !nickname.trim()}
                        >
                            {isCreating ? 'Generating keys...' : 'Create Room'}
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Join Room */}
                    <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
                        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <Link2 className="w-5 h-5 text-primary" />
                            Join Existing Room
                        </h2>

                        <Input
                            placeholder="Your anonymous nickname..."
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                        />

                        <Input
                            placeholder="Paste secure room link..."
                            value={joinLink}
                            onChange={(e) => setJoinLink(e.target.value)}
                        />

                        <Button
                            variant="cyber"
                            className="w-full"
                            size="lg"
                            onClick={handleJoinRoom}
                            disabled={!nickname.trim() || !joinLink.trim()}
                        >
                            Join Securely
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </motion.div>
            </div>

            {/* Footer */}
            <footer className="p-6 text-center border-t border-border">
                <p className="text-xs text-muted-foreground font-mono">
                    <Lock className="w-3 h-3 inline mr-1" />
                    End-to-end encrypted with AES-256-GCM • Keys never leave your device
                </p>
            </footer>
        </div>
    );
}
