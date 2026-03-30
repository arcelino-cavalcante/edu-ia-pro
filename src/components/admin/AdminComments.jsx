import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, limit } from 'firebase/firestore';
import { MessageSquare, Reply, CheckCircle2, Search } from 'lucide-react';
import { db } from '../../lib/firebase';
import { Button } from '../common/Button';
import { useNotification } from '../../context/NotificationContext';

export const AdminComments = () => {
    const [comments, setComments] = useState([]);
    const [replyText, setReplyText] = useState('');
    const [replyingTo, setReplyingTo] = useState(null); // comment ID
    const { sendPersonalNotification } = useNotification();

    const [itemsToShow, setItemsToShow] = useState(20);

    useEffect(() => {
        const q = query(
            collection(db, "comments"),
            orderBy("createdAt", "desc"),
            limit(itemsToShow)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setComments(data);
        });
        return () => unsubscribe();
    }, [itemsToShow]);

    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'replied'

    // Filter Comments
    const filteredComments = comments.filter(c => {
        // Tab Filter
        if (activeTab === 'pending' && c.reply) return false;
        if (activeTab === 'replied' && !c.reply) return false;

        // Search Filter
        const search = searchTerm.toLowerCase();
        return (c.text?.toLowerCase().includes(search) ||
            c.userName?.toLowerCase().includes(search) ||
            c.lessonName?.toLowerCase().includes(search));
    });

    const handleReply = async (comment) => {
        if (!replyText.trim()) return;

        try {
            const commentRef = doc(db, "comments", comment.id);
            await updateDoc(commentRef, {
                reply: {
                    text: replyText,
                    createdAt: new Date().toISOString()
                },
                status: 'replied'
            });

            // Notify Student
            await sendPersonalNotification(
                comment.userId,
                "Resposta do Professor",
                `Sua dúvida na aula "${comment.lessonName}" foi respondida!`,
                "reply"
            );

            setReplyText('');
            setReplyingTo(null);
        } catch (error) {
            console.error("Erro ao responder:", error);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Central de Dúvidas</h2>
                    <p className="text-gray-500 mt-2">Gerencie e responda as perguntas dos alunos.</p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar dúvida, aluno ou aula..."
                        className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white bg-white shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`pb-3 px-1 font-medium text-sm transition-all relative ${activeTab === 'pending' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    Pendentes
                    {activeTab === 'pending' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t-full"></span>}
                </button>
                <button
                    onClick={() => setActiveTab('replied')}
                    className={`pb-3 px-1 font-medium text-sm transition-all relative ${activeTab === 'replied' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    Respondidas
                    {activeTab === 'replied' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t-full"></span>}
                </button>
            </div>

            <div className="grid gap-6">
                {filteredComments.map(comment => (
                    <div key={comment.id} className={`bg-white dark:bg-gray-800 rounded-xl p-6 border ${comment.reply ? 'border-gray-100 dark:border-gray-700' : 'border-l-4 border-l-indigo-500 border-gray-100 dark:border-gray-700 shadow-lg'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300">
                                    {comment.userName?.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-white">{comment.userName}</h4>
                                    <p className="text-xs text-gray-500">Aula: {comment.lessonName}</p>
                                </div>
                            </div>
                            <span className="text-xs text-gray-400">
                                {comment.createdAt?.seconds ? new Date(comment.createdAt.seconds * 1000).toLocaleDateString() : 'Hoje'}
                            </span>
                        </div>

                        <p className="text-gray-700 dark:text-gray-300 mb-6 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">{comment.text}</p>

                        {comment.reply ? (
                            <div className="ml-8 bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                                <div className="flex items-center gap-2 mb-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                                    <CheckCircle2 size={16} /> Respondido
                                </div>
                                <p className="text-emerald-800 dark:text-emerald-300">{comment.reply.text}</p>
                            </div>
                        ) : (
                            <div className="mt-4">
                                {replyingTo === comment.id ? (
                                    <div className="animate-in fade-in">
                                        <textarea
                                            value={replyText}
                                            onChange={e => setReplyText(e.target.value)}
                                            placeholder="Escreva sua resposta..."
                                            className="w-full bg-white dark:bg-gray-900 border dark:border-gray-600 rounded-lg p-3 text-gray-900 dark:text-white mb-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            rows={3}
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-3">
                                            <Button variant="ghost" onClick={() => setReplyingTo(null)}>Cancelar</Button>
                                            <Button onClick={() => handleReply(comment)}>Enviar Resposta</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Button variant="outline" onClick={() => setReplyingTo(comment.id)}>
                                        <Reply size={16} className="mr-2" /> Responder
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {comments.length === 0 && (
                    <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                        <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">Nenhuma dúvida pendente.</p>
                    </div>
                )}

                {comments.length >= itemsToShow && (
                    <div className="flex justify-center mt-6">
                        <Button variant="outline" onClick={() => setItemsToShow(prev => prev + 20)}>
                            Carregar mais dúvidas
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
