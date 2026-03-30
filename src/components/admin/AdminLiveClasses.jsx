import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Video, Plus, Trash2, ExternalLink, Copy, Play } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const AdminLiveClasses = ({ onEnterClass }) => {
    const { toast } = useToast();
    const [rooms, setRooms] = useState([]);
    const [newRoomName, setNewRoomName] = useState('');
    const [customLink, setCustomLink] = useState('');
    const [creating, setCreating] = useState(false);

    // Deletion Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [roomToDelete, setRoomToDelete] = useState(null);

    useEffect(() => {
        const q = query(collection(db, "live_classes"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    const createRoom = async (e) => {
        e.preventDefault();
        if (!newRoomName.trim()) return;

        setCreating(true);
        try {
            const uniqueRoomId = `DevARC-${Math.random().toString(36).substring(7)}-${Date.now()}`;
            await addDoc(collection(db, "live_classes"), {
                name: newRoomName,
                roomId: uniqueRoomId,
                customLink: customLink.trim() || null, // Optional Link
                isActive: true,
                createdAt: serverTimestamp(),
                createdBy: 'admin'
            });
            setNewRoomName('');
            setCustomLink('');
            toast.success("Sala criada com sucesso!");
        } catch (error) {
            console.error("Error creating room:", error);
            toast.error("Erro ao criar sala.");
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteClick = (room) => {
        setRoomToDelete(room);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!roomToDelete) return;
        try {
            await deleteDoc(doc(db, "live_classes", roomToDelete.id));
            toast.success("Sala excluída.");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao excluir sala.");
        } finally {
            setShowDeleteModal(false);
            setRoomToDelete(null);
        }
    };

    const toggleStatus = async (room) => {
        await updateDoc(doc(db, "live_classes", room.id), {
            isActive: !room.isActive
        });
        toast.info(room.isActive ? "Sala encerrada." : "Sala reativada.");
    };

    const copyLink = (roomId) => {
        navigator.clipboard.writeText(roomId);
        toast.info(`ID copiado: ${roomId}`);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Aulas Ao Vivo</h2>
                    <p className="text-gray-500 mt-2">Crie e gerencie suas salas de aula virtuais.</p>
                </div>
            </div>

            {/* Create Room Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Nova Sala de Aula</h3>
                <form onSubmit={createRoom} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 flex flex-col md:flex-row gap-4 w-full">
                        <input
                            type="text"
                            placeholder="Nome da Aula (ex: Mentoria Semanal)"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-xl dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <input
                            type="text"
                            placeholder="Link externo (Zoom/Meet/YouTube) - Opcional"
                            value={customLink}
                            onChange={(e) => setCustomLink(e.target.value)}
                            className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-xl dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={creating || !newRoomName.trim()}
                        className="bg-[#0a0a0a] hover:bg-black dark:hover:bg-gray-200 dark:bg-white text-white dark:text-[#0a0a0a] px-6 py-2 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors h-[42px]"
                    >
                        <Plus size={20} />
                        Criar
                    </button>
                </form>
            </div>

            {/* Rooms List */}
            <div className="grid gap-4 mt-8">
                {rooms.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                        Nenhuma sala criada ainda.
                    </div>
                ) : (
                    rooms.map(room => (
                        <div key={room.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${room.isActive ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                                    <Video size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{room.name}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">ID: {room.roomId}</p>
                                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${room.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                                        {room.isActive ? 'Sala Ativa' : 'Encerrada'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => toggleStatus(room)}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${room.isActive ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40' : 'text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40'}`}
                                >
                                    {room.isActive ? 'Encerrar' : 'Reativar'}
                                </button>
                                <button
                                    onClick={() => copyLink(room.roomId)}
                                    className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg flex items-center gap-2"
                                    title="Copiar ID"
                                >
                                    <Copy size={16} />
                                </button>
                                <button
                                    onClick={() => {
                                        const link = room.customLink || `https://meet.jit.si/${room.roomId}`;
                                        window.open(link, '_blank');
                                    }}
                                    className="px-4 py-1.5 text-sm font-medium text-white dark:text-[#0a0a0a] bg-[#0a0a0a] dark:bg-white hover:bg-black dark:hover:bg-gray-200 rounded-lg flex items-center gap-2 shadow-sm shadow-indigo-200 dark:shadow-none"
                                >
                                    {room.customLink ? <ExternalLink size={16} /> : <Play size={16} />}
                                    Entrar
                                </button>
                                <button
                                    onClick={() => handleDeleteClick(room)}
                                    className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg flex items-center gap-2"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {
                showDeleteModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-700 scale-100 animate-in zoom-in-95 duration-200">
                            <h3 className="text-lg font-bold mb-2 dark:text-white">Excluir Sala?</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                                Você está prestes a excluir a sala "{roomToDelete?.name}". Esta ação não pode ser desfeita.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm shadow-red-200 dark:shadow-none"
                                >
                                    Sim, Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};
