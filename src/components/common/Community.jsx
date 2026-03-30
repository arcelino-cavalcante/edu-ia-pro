import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc, doc, arrayUnion, arrayRemove, deleteDoc, limit, startAfter, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { MessageSquare, Heart, Send, MoreVertical, Trash2, User, Image as ImageIcon, X, Award, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';

export const Community = () => {
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const [posts, setPosts] = useState([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // Pagination State
    const [lastVisible, setLastVisible] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const POSTS_PER_PAGE = 20;

    // Comment State
    const [activeCommentPostId, setActiveCommentPostId] = useState(null);
    const [commentText, setCommentText] = useState('');

    useEffect(() => {
        const fetchInitialPosts = async () => {
            const q = query(collection(db, "community_posts"), orderBy("createdAt", "desc"), limit(POSTS_PER_PAGE));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
                const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPosts(postsData);

                if (snapshot.docs.length < POSTS_PER_PAGE) {
                    setHasMore(false);
                }
            } else {
                setHasMore(false);
            }
            setLoading(false);
        };

        fetchInitialPosts();

        // Removed onSnapshot to avoid expensive re-reads on every new post when the list grows.
        // We will manually append new posts to the top of the list locally instead.
    }, []);

    const loadMorePosts = async () => {
        if (!lastVisible || !hasMore || loadingMore) return;

        setLoadingMore(true);
        try {
            const q = query(
                collection(db, "community_posts"),
                orderBy("createdAt", "desc"),
                startAfter(lastVisible),
                limit(POSTS_PER_PAGE)
            );

            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
                const newPostsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPosts(prev => [...prev, ...newPostsData]);

                if (snapshot.docs.length < POSTS_PER_PAGE) {
                    setHasMore(false);
                }
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error("Error loading more posts:", error);
            toast.error("Erro ao carregar mais posts.");
        } finally {
            setLoadingMore(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast.error("A imagem deve ter no máximo 5MB.");
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!newPostContent.trim() && !imageFile) return;

        setSending(true);
        try {
            let imageUrl = null;

            if (imageFile) {
                const { storage } = await import('../../lib/firebase');
                const fileRef = ref(storage, `community/${Date.now()}_${imageFile.name}`);
                await uploadBytes(fileRef, imageFile);
                imageUrl = await getDownloadURL(fileRef);
            }

            const newPostData = {
                content: newPostContent,
                imageUrl: imageUrl,
                authorId: currentUser.uid || currentUser.id,
                authorName: currentUser.name || 'Aluno',
                authorRole: currentUser.role || 'student',
                authorAvatar: currentUser.profileImage || null,
                likes: [],
                comments: [],
                createdAt: serverTimestamp() // Temporarily use this for DB, but we need a real date for local state immediately
            };

            const docRef = await addDoc(collection(db, "community_posts"), newPostData);

            // Append locally to avoid fetching again
            const localPost = {
                id: docRef.id,
                ...newPostData,
                createdAt: new Date().toISOString() // Use a real date string locally so formatDate works immediately
            };

            setPosts(prev => [localPost, ...prev]);

            setNewPostContent('');
            removeImage();
            toast.success("Publicado com sucesso!");
        } catch (error) {
            console.error("Error posting:", error);
            toast.error("Erro ao publicar na comunidade.");
        } finally {
            setSending(false);
        }
    };

    const handleLike = async (post) => {
        const userId = currentUser.uid || currentUser.id;
        const postRef = doc(db, "community_posts", post.id);

        if (post.likes?.includes(userId)) {
            await updateDoc(postRef, {
                likes: arrayRemove(userId)
            });
            // Update local state
            setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: p.likes.filter(id => id !== userId) } : p));
        } else {
            await updateDoc(postRef, {
                likes: arrayUnion(userId)
            });
            // Update local state
            setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: [...(p.likes || []), userId] } : p));
        }
    };

    const handleDeletePost = async (postId) => {
        if (window.confirm("Apagar este post?")) {
            await deleteDoc(doc(db, "community_posts", postId));
            // Update local state
            setPosts(prev => prev.filter(p => p.id !== postId));
            toast.success("Post apagado.");
        }
    };

    const handleAddComment = async (postId) => {
        if (!commentText.trim()) return;

        try {
            const postRef = doc(db, "community_posts", postId);
            const newComment = {
                id: Date.now().toString(),
                text: commentText,
                authorId: currentUser.uid || currentUser.id,
                authorName: currentUser.name || 'Aluno',
                authorAvatar: currentUser.profileImage || null,
                createdAt: new Date().toISOString()
            };

            await updateDoc(postRef, {
                comments: arrayUnion(newComment)
            });

            // Update local state
            setPosts(prev => prev.map(p => {
                if (p.id === postId) {
                    return { ...p, comments: [...(p.comments || []), newComment] };
                }
                return p;
            }));

            setCommentText('');
            // Optional: Keep comment section open or close it
        } catch (error) {
            console.error(error);
            toast.error("Erro ao comentar");
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        // If Firestore Timestamp
        if (timestamp.toDate) return timestamp.toDate().toLocaleDateString() + ' ' + timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        // If standard JS date or string (fallback)
        return new Date(timestamp).toLocaleDateString();
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Carregando comunidade...</div>;

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Comunidade VIP</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Dúvidas, networks e conquistas. Juntos vamos mais longe!</p>
            </div>

            {/* Create Post */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-8 transition-all">
                <div className="flex gap-4">
                    {currentUser?.profileImage ? (
                        <img src={currentUser.profileImage} alt="Avatar" className="w-12 h-12 rounded-full object-cover shadow-sm bg-gray-100" />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-white/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg shadow-sm">
                            {currentUser.name?.charAt(0) || 'U'}
                        </div>
                    )}
                    <div className="flex-1">
                        <textarea
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            placeholder={currentUser?.role === 'admin' ? "Compartilhe um aviso oficial com os alunos..." : "No que você está pensando? Dúvidas ou conquistas?"}
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl p-4 focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white placeholder-gray-400 resize-none h-24 mb-3 transition-colors outline-none"
                        />

                        {/* Image Preview Box */}
                        {imagePreview && (
                            <div className="relative mb-4 inline-block">
                                <img src={imagePreview} alt="Preview" className="max-h-48 rounded-xl object-contain border border-gray-200 dark:border-gray-700" />
                                <button
                                    onClick={removeImage}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}

                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                                <label className="cursor-pointer flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-white/10 px-3 py-2 rounded-lg transition-colors">
                                    <ImageIcon size={20} />
                                    <span>Anexar Foto</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageChange}
                                        disabled={sending}
                                    />
                                </label>
                            </div>
                            <Button
                                onClick={handleCreatePost}
                                disabled={(!newPostContent.trim() && !imageFile) || sending}
                                className="px-6 py-2 rounded-full font-bold shadow-md hover:shadow-lg"
                            >
                                {sending ? 'Publicando...' : 'Publicar'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Feed */}
            <div className="space-y-6">
                {posts.map(post => {
                    const isLiked = post.likes?.includes(currentUser.uid || currentUser.id);
                    const isAuthor = (post.authorId === (currentUser.uid || currentUser.id)) || currentUser.role === 'admin';

                    return (
                        <div key={post.id} className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border transition-shadow hover:shadow-md ${post.authorRole === 'admin' ? 'border-amber-400/50 shadow-amber-100/20 dark:border-amber-500/30' : 'border-gray-100 dark:border-gray-700'}`}>
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-3 items-center">
                                    {post.authorAvatar ? (
                                        <img src={post.authorAvatar} alt={post.authorName} className="w-12 h-12 rounded-full object-cover shadow-sm bg-gray-100 dark:bg-gray-700" />
                                    ) : (
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm ${post.authorRole === 'admin' ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                                            {post.authorName?.charAt(0)}
                                        </div>
                                    )}

                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-[15px]">
                                            {post.authorName}
                                            {post.authorRole === 'admin' && (
                                                <span className="text-[10px] bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2 py-0.5 rounded pl-1.5 pr-2 uppercase font-black tracking-wider shadow-sm flex items-center gap-1">
                                                    <Award size={10} /> Oficial
                                                </span>
                                            )}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{formatDate(post.createdAt)}</p>
                                    </div>
                                </div>
                                {isAuthor && (
                                    <button onClick={() => handleDeletePost(post.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors p-2">
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>

                            {/* Content */}
                            <div className="text-gray-800 dark:text-gray-200 mb-4 whitespace-pre-wrap leading-relaxed text-[15px]">
                                {post.content}
                            </div>

                            {/* Image Attachment (If Any) */}
                            {post.imageUrl && (
                                <div className="mb-5 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                                    <img src={post.imageUrl} alt="Anexo da Comunidade" className="w-full h-auto max-h-[500px] object-contain" />
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-6 border-t border-gray-100 dark:border-gray-700 pt-4">
                                <button
                                    onClick={() => handleLike(post)}
                                    className={`flex items-center gap-2 text-sm font-medium transition-colors ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                >
                                    <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
                                    {post.likes?.length || 0} <span className="hidden sm:inline">Curtidas</span>
                                </button>

                                <button
                                    onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                                    className={`flex items-center gap-2 text-sm font-medium transition-colors ${activeCommentPostId === post.id ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                >
                                    <MessageSquare size={18} />
                                    {post.comments?.length || 0} <span className="hidden sm:inline">Comentários</span>
                                </button>
                            </div>

                            {/* Comments Section */}
                            {activeCommentPostId === post.id && (
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 animate-in slide-in-from-top-2 duration-200">
                                    <div className="space-y-4 mb-4 max-h-60 overflow-y-auto custom-scrollbar">
                                        {post.comments?.map((comment, idx) => (
                                            <div key={idx} className="flex gap-3">
                                                {comment.authorAvatar ? (
                                                    <img src={comment.authorAvatar} alt="Avatar" className="w-8 h-8 rounded-full flex-shrink-0 object-cover shadow-sm bg-gray-100 dark:bg-gray-700" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300 font-bold">
                                                        {comment.authorName?.charAt(0)}
                                                    </div>
                                                )}
                                                <div className="flex-1 bg-gray-50 dark:bg-gray-900/50 rounded-lg rounded-tl-none p-3 border border-gray-100 dark:border-gray-800">
                                                    <div className="flex justify-between items-baseline mb-1">
                                                        <span className="font-semibold text-[13px] text-gray-900 dark:text-gray-200">{comment.authorName}</span>
                                                        <span className="text-[10px] text-gray-400 font-medium">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300">{comment.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {(!post.comments || post.comments.length === 0) && (
                                            <p className="text-center text-gray-400 text-sm py-2">Seja o primeiro a comentar!</p>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                                            placeholder="Escreva um comentário..."
                                            className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-xl dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                        />
                                        <button
                                            onClick={() => handleAddComment(post.id)}
                                            disabled={!commentText.trim()}
                                            className="p-2 bg-[#0a0a0a]text-white dark:bg-white dark:text-[#0a0a0a]hover:bg-black dark:hover:bg-gray-200 disabled:opacity-50 transition-colors"
                                        >
                                            <Send size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Load More Button */}
            {hasMore && posts.length > 0 && (
                <div className="mt-8 flex justify-center">
                    <Button
                        variant="secondary"
                        onClick={loadMorePosts}
                        disabled={loadingMore}
                        className="flex items-center gap-2 rounded-full px-6"
                    >
                        {loadingMore ? 'Carregando...' : 'Carregar mais posts'}
                        {!loadingMore && <ChevronDown size={18} />}
                    </Button>
                </div>
            )}
        </div>
    );
};
