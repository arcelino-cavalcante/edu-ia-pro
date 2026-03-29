import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Save, Trash2, AlertTriangle, ShieldAlert, CheckCircle } from 'lucide-react';
import { doc, setDoc, collection, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';

export const AdminProfileModal = ({ onClose }) => {
    const { currentUser, updateCurrentUserLocally } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'danger'

    // Profile State
    const [name, setName] = useState(currentUser?.name || '');
    const [avatar, setAvatar] = useState(currentUser?.avatar || '');
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatar || '');

    // Novas Informações de Perfil Adicionais
    const [city, setCity] = useState(currentUser?.city || '');
    const [whatsapp, setWhatsapp] = useState(currentUser?.whatsapp || '');
    const [contactEmail, setContactEmail] = useState(currentUser?.contactEmail || '');

    // Danger Zone State
    const [confirmDeleteText, setConfirmDeleteText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const handleUpdateProfile = async () => {
        if (!name.trim()) return toast.error("Nome é obrigatório.");
        setLoading(true);
        try {
            let avatarUrl = avatar;

            // Upload de nova foto caso tenha selecionado um arquivo
            if (avatarFile) {
                const imageRef = ref(storage, `avatars/${currentUser.id}_${Date.now()}`);
                await uploadBytes(imageRef, avatarFile);
                avatarUrl = await getDownloadURL(imageRef);
                setAvatar(avatarUrl);
            }

            // Atualização no Banco de Dados
            const updatePayload = {
                name: name.trim(),
                avatar: avatarUrl,
                email: currentUser.email,
                city: city.trim(),
                whatsapp: whatsapp.trim(),
                contactEmail: contactEmail.trim(),
                updatedAt: new Date().toISOString()
            };

            // Corrige a falha de segurança para não promover alunos acidentalmente
            if (currentUser.role === 'admin') {
                updatePayload.role = 'admin';
            }

            await setDoc(doc(db, "users", currentUser.id), updatePayload, { merge: true });

            // Atualiza sessão em tempo real sem precisar deslogar
            if (updateCurrentUserLocally) {
                updateCurrentUserLocally({
                    name: name.trim(),
                    avatar: avatarUrl,
                    city: city.trim(),
                    whatsapp: whatsapp.trim(),
                    contactEmail: contactEmail.trim()
                });
            }

            toast.success("Perfil atualizado com sucesso!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao atualizar perfil.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAnsweredComments = async () => {
        setIsDeleting(true);
        try {
            const commentsSnap = await getDocs(collection(db, "comments"));
            let deletedCount = 0;
            const batch = writeBatch(db);

            commentsSnap.docs.forEach(docSnap => {
                const data = docSnap.data();
                if (data.replies && data.replies.length > 0) {
                    batch.delete(docSnap.ref);
                    deletedCount++;
                }
            });

            if (deletedCount > 0) {
                await batch.commit();
                toast.success(`${deletedCount} comentários respondidos foram apagados.`);
            } else {
                toast.info("Nenhum comentário respondido encontrado.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro ao apagar comentários.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleResetDatabase = async () => {
        if (confirmDeleteText !== 'ZERAR TUDO') {
            return toast.error("Digite 'ZERAR TUDO' para confirmar.");
        }

        setIsDeleting(true);
        try {
            // 1. Delete all Structure
            const structureSnap = await getDocs(collection(db, "structure"));
            structureSnap.docs.forEach(async (d) => await deleteDoc(d.ref));

            // 2. Delete all Comments
            const commentsSnap = await getDocs(collection(db, "comments"));
            commentsSnap.docs.forEach(async (d) => await deleteDoc(d.ref));

            // 3. Delete all Users EXCEPT Current Admin
            const usersSnap = await getDocs(collection(db, "users"));
            let deletedUsers = 0;
            for (const d of usersSnap.docs) {
                if (d.id !== currentUser.id) {
                    await deleteDoc(d.ref);
                    deletedUsers++;
                }
            }

            toast.success(`Banco resetado! ${deletedUsers} usuários removidos.`);
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Erro crítico ao resetar banco.");
        } finally {
            setIsDeleting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                        <User className="text-indigo-500" /> Meu Perfil
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 dark:border-gray-800">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex-1 p-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'profile' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                        Dados do Perfil
                    </button>
                    {currentUser?.role === 'admin' && (
                        <button
                            onClick={() => setActiveTab('danger')}
                            className={`flex-1 p-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'danger' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-transparent text-gray-500 hover:text-red-600 dark:hover:text-red-400'}`}
                        >
                            Zona de Perigo
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto">
                    {activeTab === 'profile' ? (
                        <div className="space-y-6">
                            <div className="flex flex-col items-center mb-8">
                                <div className="relative group mb-4">
                                    <img
                                        src={avatarPreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`}
                                        alt="Avatar"
                                        className="w-28 h-28 rounded-full bg-gray-100 object-cover border-4 border-white dark:border-gray-800 shadow-xl"
                                    />
                                    <label htmlFor="avatar-upload" className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]">
                                        <User className="text-white mb-1" size={24} />
                                        <p className="text-white text-[10px] font-bold uppercase tracking-wider">Alterar Foto</p>
                                    </label>
                                    <input
                                        type="file"
                                        id="avatar-upload"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                setAvatarFile(file);
                                                setAvatarPreview(URL.createObjectURL(file));
                                            }
                                        }}
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-gray-400 w-48 mx-auto">Recomendado: Imagem quadrada (JPG ou PNG), tamanho máx. 2MB</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome Completo</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Seu nome"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cidade de Residência</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all text-sm"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        placeholder="Sua cidade"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">WhatsApp</label>
                                    <input
                                        type="tel"
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all text-sm font-mono"
                                        value={whatsapp}
                                        onChange={(e) => setWhatsapp(e.target.value)}
                                        placeholder="(DD) 99999-9999"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">E-mail de Contato (Alternativo)</label>
                                <input
                                    type="email"
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all text-sm"
                                    value={contactEmail}
                                    onChange={(e) => setContactEmail(e.target.value)}
                                    placeholder="O seu melhor e-mail para recados..."
                                />
                                <p className="text-xs text-gray-500 mt-2">Isto não muda o e-mail que você usa para acessar a plataforma.</p>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <Button onClick={handleUpdateProfile} disabled={loading} className="w-full md:w-auto">
                                    <Save size={18} /> Salvar Alterações
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Delete Answered Comments */}
                            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-xl p-5">
                                <div className="flex gap-4">
                                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg h-fit text-yellow-600 dark:text-yellow-400">
                                        <CheckCircle size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Limpar Comentários Respondidos</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                            Isso irá apagar permanentemente todos os comentários que já possuem resposta. Útil para manter o banco limpo.
                                        </p>
                                        <button
                                            onClick={handleDeleteAnsweredComments}
                                            disabled={isDeleting}
                                            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                        >
                                            <Trash2 size={16} /> {isDeleting ? 'Limpando...' : 'Apagar Respondidos'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Reset Database */}
                            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-5">
                                <div className="flex gap-4">
                                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg h-fit text-red-600 dark:text-red-400">
                                        <ShieldAlert size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Resetar Plataforma (Zerar Banco)</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                            <strong>Atenção:</strong> Isso apagará TODOS os usuários, cursos, módulos, aulas e comentários.
                                            <br />Apenas a sua conta de administrador será preservada.
                                            <br />Essa ação não pode ser desfeita.
                                        </p>

                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Confirmação de Segurança</label>
                                            <input
                                                type="text"
                                                placeholder="Digite ZERAR TUDO"
                                                className="w-full bg-white dark:bg-gray-950 border border-red-200 dark:border-red-900 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-red-500 text-sm"
                                                value={confirmDeleteText}
                                                onChange={(e) => setConfirmDeleteText(e.target.value)}
                                            />
                                            <button
                                                onClick={handleResetDatabase}
                                                disabled={isDeleting || confirmDeleteText !== 'ZERAR TUDO'}
                                                className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                                            >
                                                <AlertTriangle size={18} /> {isDeleting ? 'Resetando Banco de Dados...' : 'ZERAR TODO O BANCO'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
