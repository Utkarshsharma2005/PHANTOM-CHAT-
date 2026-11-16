import { useState, useEffect } from 'react';
import { HomeView } from '@/components/HomeView';
import { ChatRoom } from '@/components/ChatRoom';
import { base64ToKey, keyToBase64 } from '@/lib/crypto';
import { clearSession, loadSession, saveSession } from '@/lib/sessionStore';

interface RoomSession {
    roomId: string;
    cryptoKey: CryptoKey;
    nickname: string;
    expiresAt: number;
}

const Index = () => {
    const [session, setSession] = useState<RoomSession | null>(null);

    // Invitation secret lives in the URL fragment, which browsers do not send in HTTP requests.
    // the user followed a join link, so store the params and pre-fill the
    // join input so they only need to enter a nickname.
    const [autoJoinParams, setAutoJoinParams] = useState<{ roomId: string; keyBase64: string; expiresAt?: string } | null>(null);

    useEffect(() => {
        const checkUrlParams = async () => {
            const params = new URLSearchParams(window.location.search);
            const roomId = params.get('room');
            const keyBase64 = new URLSearchParams(window.location.hash.slice(1)).get('key');

            if (roomId && keyBase64) {
                try {
                    // Validate the key is parseable before committing
                    await base64ToKey(keyBase64);
                    setAutoJoinParams({ roomId, keyBase64, expiresAt: params.get('expiresAt') ?? undefined });
                } catch { setAutoJoinParams(null); }
            }
        };

        checkUrlParams();
    }, []);

    // Recover the prior room after a refresh or a short network interruption.
    useEffect(() => {
        const hasInvite = new URLSearchParams(window.location.search).has('room')
            && new URLSearchParams(window.location.hash.slice(1)).has('key');
        if (hasInvite) return;
        let mounted = true;
        void loadSession().then(async saved => {
            if (!saved) return;
            if (!saved.roomId || !saved.nickname || saved.expiresAt <= Date.now()) {
                if (saved.roomId) localStorage.removeItem(`phantom_outbox_${saved.roomId}`);
                await clearSession();
                return;
            }
            if (mounted) {
                setSession(saved);
                window.history.replaceState({}, '', `/?room=${saved.roomId}`);
            }
        }).catch(() => {
            if (mounted) console.error('Could not restore the locally stored chat session.');
        });
        return () => { mounted = false; };
    }, []);

    const persistSession = async (roomId: string, cryptoKey: CryptoKey, nickname: string, expiresAt: number) => {
        const keyBase64 = await keyToBase64(cryptoKey);
        const persistentKey = await base64ToKey(keyBase64, false);
        await saveSession({ roomId, cryptoKey: persistentKey, nickname, expiresAt });
        sessionStorage.setItem(`phantom_link_${roomId}`, `${window.location.origin}/?room=${roomId}&expiresAt=${expiresAt}#key=${encodeURIComponent(keyBase64)}`);
        window.history.replaceState({}, '', `/?room=${roomId}`);
        setSession({ roomId, cryptoKey: persistentKey, nickname, expiresAt });
    };

    const handleCreateRoom = persistSession;
    const handleJoinRoom = persistSession;

    const handleLeaveRoom = () => {
        setSession(null);
        void clearSession();
        localStorage.removeItem(`phantom_outbox_${session?.roomId}`);
        if (session) sessionStorage.removeItem(`phantom_link_${session.roomId}`);
        window.history.replaceState({}, '', '/');
    };

    if (session) {
        return (
            <ChatRoom
                roomId={session.roomId}
                nickname={session.nickname}
                cryptoKey={session.cryptoKey}
                expiresAt={session.expiresAt}
                onLeave={handleLeaveRoom}
            />
        );
    }

    // Build the full join link from auto-detected URL params (if any)
    const autoJoinLink = autoJoinParams
        ? `${window.location.origin}/?room=${autoJoinParams.roomId}${autoJoinParams.expiresAt ? `&expiresAt=${encodeURIComponent(autoJoinParams.expiresAt)}` : ''}#key=${encodeURIComponent(autoJoinParams.keyBase64)}`
        : undefined;

    return <HomeView key={autoJoinLink ?? 'home'} onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} autoJoinLink={autoJoinLink} />;
};

export default Index;
