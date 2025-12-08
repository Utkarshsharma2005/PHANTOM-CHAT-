import { useState, useEffect } from 'react';
import { HomeView } from '@/components/HomeView';
import { ChatRoom } from '@/components/ChatRoom';
import { base64ToKey } from '@/lib/crypto';

interface RoomSession {
    roomId: string;
    cryptoKey: CryptoKey;
    nickname: string;
    expiresAt: number;
}

const Index = () => {
    const [session, setSession] = useState<RoomSession | null>(null);

    // Check for room link on load
    useEffect(() => {
        const checkUrlParams = async () => {
            const params = new URLSearchParams(window.location.search);
            const roomId = params.get('room');
            const keyBase64 = params.get('key');

            if (roomId && keyBase64) {
                try {
                    await base64ToKey(keyBase64);
                    // Store key in session storage for security
                    sessionStorage.setItem('chatKey', keyBase64);
                    sessionStorage.setItem('roomId', roomId);
                    // Clean URL immediately
                    window.history.replaceState({}, '', `?room=${roomId}`);
                } catch (error) {
                    console.error('Failed to process room key:', error);
                }
            }
        };

        checkUrlParams();
    }, []);

    const handleCreateRoom = (roomId: string, cryptoKey: CryptoKey, nickname: string, expiresAt: number) => {
        setSession({ roomId, cryptoKey, nickname, expiresAt });
    };

    const handleJoinRoom = (roomId: string, cryptoKey: CryptoKey, nickname: string, expiresAt: number) => {
        setSession({ roomId, cryptoKey, nickname, expiresAt });
    };

    const handleLeaveRoom = () => {
        setSession(null);
        sessionStorage.removeItem('chatKey');
        sessionStorage.removeItem('roomId');
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

    return <HomeView onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />;
};

export default Index;
