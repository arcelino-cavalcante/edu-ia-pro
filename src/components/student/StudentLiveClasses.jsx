import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Video, Cast } from 'lucide-react';

export const StudentLiveClasses = ({ onEnterClass }) => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Only show active classes to students
        // Removed orderBy to avoid index error. Sorting client-side.
        const q = query(
            collection(db, "live_classes"),
            where("isActive", "==", true)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Filter out classes older than 24 hours
            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

            const activeData = data.filter(room => {
                if (!room.createdAt) return true; // Keep if no date (safe fallback)
                const roomDate = room.createdAt.toDate ? room.createdAt.toDate() : new Date(room.createdAt);
                return roomDate > oneDayAgo;
            });

            // Client-side sort: Newest first
            activeData.sort((a, b) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            });
            setRooms(activeData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Carregando aulas...</div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Aulas Ao Vivo</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Participe das mentorias e tire suas dúvidas em tempo real.</p>

            {rooms.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-dashed border-gray-300 dark:border-gray-700">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-white/10 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Video size={32} />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Nenhuma aula acontecendo agora</h3>
                    <p className="text-gray-500 dark:text-gray-400">Fique atento às notificações para saber quando a próxima aula começar!</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rooms.map(room => (
                        <div key={room.id} className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300 relative">
                            <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600 relative overflow-hidden">
                                <div className="absolute inset-0 bg-black/10"></div>
                                <div className="absolute top-4 right-4 animate-pulse">
                                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                                        <span className="w-2 h-2 bg-white rounded-full"></span>
                                        AO VIVO
                                    </span>
                                </div>
                                <div className="absolute -bottom-6 left-6">
                                    <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-lg text-indigo-600">
                                        <Cast size={24} />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 p-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-[#0a0a0a] dark:group-hover:text-white transition-colors">
                                    {room.name}
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                                    Clique para entrar na sala e participar da discussão.
                                </p>

                                <button
                                    onClick={() => {
                                        const link = room.customLink || `https://meet.jit.si/${room.roomId}`;
                                        window.open(link, '_blank');
                                    }}
                                    className="w-full bg-[#0a0a0a]hover:bg-black dark:hover:bg-gray-200 dark:bg-white dark:text-[#0a0a0a]text-white font-medium py-3 rounded-xl transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
                                >
                                    <Video size={20} />
                                    Entrar na Sala {room.customLink ? '(Link Externo)' : ''}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
