import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { Send, User, MessageCircle } from 'lucide-react';
import { db } from '../../lib/firebase';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export const CommentSection = ({ lessonId, lessonName }) => {
    const { currentUser } = useAuth();
    const { sendGlobalNotification } = useNotification();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);

    const [visibleCount, setVisibleCount] = useState(20);

    useEffect(() => {
        if (!lessonId) return;

        const q = query(
            collection(db, "comments"),
            where("lessonId", "==", lessonId),
            orderBy("createdAt", "desc"),
            limit(visibleCount)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setComments(data);
        });

        return () => unsubscribe();
    }, [lessonId, visibleCount]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setLoading(true);

        try {
            await addDoc(collection(db, "comments"), {
                lessonId,
                lessonName,
                userId: currentUser.id,
                userName: currentUser.name || 'Aluno',
                userAvatar: currentUser.avatar || '',
                text: newComment,
                createdAt: serverTimestamp(),
                replies: []
            });

            // Notify Admins
            sendGlobalNotification(
                "Novo Comentário",
                `${currentUser.name || 'Um aluno'} comentou na aula: ${lessonName}`,
                "admin_alert"
            );

            setNewComment('');
        } catch (error) {
            console.error("Erro ao enviar comentário:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-in fade-in duration-300">
            {/* Input Area */}
            <div className="mb-8">
                <form onSubmit={handleSubmit} className="relative">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Tem alguma dúvida? Pergunte aqui..."
                        className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 pr-12 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none min-h-[100px]"
                    />
                    <button
                        type="submit"
                        disabled={loading || !newComment.trim()}
                        className="absolute bottom-4 right-4 p-2 bg-[#0a0a0a]text-white dark:bg-white dark:text-[#0a0a0a]hover:bg-black dark:hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-[#0a0a0a] dark:disabled:hover:bg-white transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>

            {/* Comments List */}
            <div className="space-y-6">
                {comments.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
                        <p>Seja o primeiro a comentar nesta aula!</p>
                    </div>
                ) : (
                    comments.map(comment => (
                        <div key={comment.id} className="flex gap-4 group">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-white/10 flex items-center justify-center shrink-0">
                                {comment.userAvatar ? (
                                    <img src={comment.userAvatar} alt={comment.userName} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{comment.userName?.charAt(0)}</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="bg-white dark:bg-white/5 rounded-2xl rounded-tl-none p-4 border border-gray-100 dark:border-white/5 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-semibold text-gray-900 dark:text-white">{comment.userName}</h4>
                                        <span className="text-xs text-gray-400">
                                            {comment.createdAt?.seconds ? new Date(comment.createdAt.seconds * 1000).toLocaleDateString() : 'Agora'}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{comment.text}</p>
                                </div>

                                {/* Admin Reply Display */}
                                {comment.reply && (
                                    <div className="flex gap-3 mt-3 ml-4 animate-in slide-in-from-left-2">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                                            <User size={14} className="text-white" />
                                        </div>
                                        <div className="bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl rounded-tl-none p-3 border border-emerald-500/10">
                                            <div className="flex justify-between items-start mb-1">
                                                <h5 className="font-semibold text-emerald-700 dark:text-emerald-400 text-xs uppercase tracking-wide">Equipe DevARC Academy</h5>
                                            </div>
                                            <p className="text-emerald-800 dark:text-emerald-200 text-sm">{comment.reply.text}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
                {comments.length >= visibleCount && (
                    <div className="flex justify-center pt-4">
                        <Button variant="ghost" size="sm" onClick={() => setVisibleCount(prev => prev + 20)}>
                            Carregar comentários anteriores
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
