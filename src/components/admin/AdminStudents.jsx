import React, { useState } from 'react';
import { Upload, Plus, MoreVertical, Search, Edit2, Trash2, Eye, EyeOff, Filter, ChevronDown } from 'lucide-react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { useToast } from '../../context/ToastContext';
import { validateStudentForm } from '../../utils/validation';
import { createStudentUser, listUsersPage, removeStudentUser, updateStudentUser } from '../../services/userService';

export const AdminStudents = ({ structure }) => { // Removed users prop
    const { toast } = useToast();
    const [loading, setLoading] = useState(true); // Loading true initially
    const [users, setUsers] = useState([]); // Local users state

    // Pagination state
    const [lastVisible, setLastVisible] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // Fetch Users on Mount
    React.useEffect(() => {
        const fetchUsers = async (role = roleFilter) => {
            setLoading(true);
            try {
                const page = await listUsersPage({ roleFilter: role });
                setUsers(page.users);
                setLastVisible(page.lastVisible);
                setHasMore(page.hasMore);
            } catch (error) {
                console.error("Error fetching users:", error);
                toast.error("Erro ao carregar alunos.");
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, [roleFilter, toast]);

    const loadMoreUsers = async () => {
        if (!lastVisible || !hasMore || loadingMore) return;

        setLoadingMore(true);
        try {
            const page = await listUsersPage({ roleFilter, lastVisible });
            setUsers((prev) => [...prev, ...page.users]);
            setLastVisible(page.lastVisible);
            setHasMore(page.hasMore);
        } catch (error) {
            console.error("Error loading more users:", error);
            toast.error("Erro ao carregar mais alunos.");
        } finally {
            setLoadingMore(false);
        }
    };

    // UI States
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
    const [showCSVModal, setShowCSVModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Data States
    const [csvData, setCsvData] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'student', turmaId: '', status: 'active' });

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'student', 'teacher', 'admin'

    const turmas = structure.filter(item => item.type === 'turma');

    const filteredUsers = users.filter(u => {
        // Search Filter
        const search = searchTerm.toLowerCase();
        const userName = String(u.name || '').toLowerCase();
        const userEmail = String(u.email || '').toLowerCase();
        return userName.includes(search) || userEmail.includes(search);
    });

    const handleSaveUser = async () => {
        const validationError = validateStudentForm(formData);
        if (validationError) {
            toast.error(validationError);
            return;
        }
        setLoading(true);
        try {
            const userData = {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: formData.role,
                ...(formData.role === 'student' ? { turmaId: formData.turmaId, progress: 0 } : { turmaId: null }),
                status: formData.status,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.name}`
            };

            if (modalMode === 'create') {
                const created = await createStudentUser(userData);
                // Manual State Update (Optimistic-ish)
                setUsers(prev => [{
                    ...created,
                    createdAt: new Date().toISOString()
                }, ...prev]);
                toast.success("Usuário criado com sucesso!");
            } else {
                await updateStudentUser(editingUser.id, userData);
                // Manual State Update
                setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...userData } : u));
                toast.success("Usuário atualizado com sucesso!");
            }

            // INVALIDATE DASHBOARD CACHE
            localStorage.removeItem('edu_pro_users_dashboard_cache');

            closeModal();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar usuário.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (user) => {
        setUserToDelete(user);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        try {
            await removeStudentUser(userToDelete.id);
            // Manual State Update
            setUsers(prev => prev.filter(u => u.id !== userToDelete.id));

            // INVALIDATE DASHBOARD CACHE
            localStorage.removeItem('edu_pro_users_dashboard_cache');

            toast.success("Usuário removido.");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao remover usuário.");
        } finally {
            setShowDeleteModal(false);
            setUserToDelete(null);
        }
    };

    const openEdit = (user) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            password: user.password || '',
            role: user.role || 'student',
            turmaId: user.turmaId || '',
            status: user.status || 'active'
        });
        setModalMode('edit');
        setShowModal(true);
    };

    const openCreate = () => {
        setModalMode('create');
        setFormData({ name: '', email: '', password: '', role: 'student', turmaId: '', status: 'active' });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingUser(null);
        setFormData({ name: '', email: '', password: '', role: 'student', turmaId: '', status: 'active' });
        setShowPassword(false);
    };

    const handleBulkImport = async () => {
        setLoading(true);
        const lines = csvData.trim().split('\n');
        let successCount = 0;
        const newUsers = [];
        for (let line of lines) {
            const [name, email, turmaId] = line.split(',');
            if (name && email && turmaId) {
                try {
                    const newUser = {
                        name: name.trim(), email: email.trim(), password: '123', turmaId: turmaId.trim(),
                        role: 'student', progress: 0, status: 'active', createdAt: new Date().toISOString(),
                        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.trim()}`
                    };
                    const createdUser = await createStudentUser(newUser);
                    newUsers.push({ id: createdUser.id, ...newUser });
                    successCount++;
                } catch (e) { console.error(e); }
            }
        }
        // Manual State Update
        if (newUsers.length > 0) {
            setUsers(prev => [...prev, ...newUsers]);
        }
        setLoading(false);
        setShowCSVModal(false);
        setCsvData('');

        // INVALIDATE DASHBOARD CACHE
        if (successCount > 0) {
            localStorage.removeItem('edu_pro_users_dashboard_cache');
        }

        toast.success(`${successCount} alunos importados com sucesso!`);
    };

    return (
        <div className="p-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div><h2 className="text-2xl font-bold text-gray-800 dark:text-white">Alunos</h2><p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Gerencie o acesso dos usuários.</p></div>
                <div className="flex gap-2 w-full md:w-auto">
                    {/* Filter Dropdown */}
                    <div className="relative">
                        <select
                            className="appearance-none bg-white dark:bg-gray-800 border dark:border-gray-600 px-4 py-2 pr-8 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                        >
                            <option value="all">Todos</option>
                            <option value="student">Alunos</option>
                            <option value="teacher">Professores</option>
                            <option value="admin">Admins</option>
                        </select>
                        <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar usuário..."
                            className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="secondary" onClick={() => setShowCSVModal(true)}><Upload size={18} /></Button>
                    <Button onClick={openCreate}><Plus size={18} /> Novo</Button>
                </div>
            </div>
            <Card className="overflow-hidden">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold"><th className="p-4 pl-6">Usuário</th><th className="p-4">Função</th><th className="p-4">Detalhes</th><th className="p-4">Status</th><th className="p-4"></th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="p-4 pl-6 flex items-center gap-3">
                                        <img src={user.avatar} className="w-10 h-10 rounded-full bg-gray-100" alt="" />
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white text-sm">{user.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                                            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-400 font-mono">
                                                <span className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-gray-500">Pass: {user.password}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <Badge color={user.role === 'teacher' ? 'purple' : user.role === 'admin' ? 'red' : 'blue'}>
                                            {user.role === 'teacher' ? 'Professor' : user.role === 'admin' ? 'Admin' : 'Aluno'}
                                        </Badge>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300 font-mono">
                                        {user.role === 'student' ? (
                                            <div>
                                                <p>{user.turmaId}</p>
                                                {user.invitedByLinkCode && (
                                                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">via {user.invitedByLinkCode}</p>
                                                )}
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td className="p-4">
                                        <Badge color={user.status === 'inactive' ? 'red' : 'green'}>
                                            {user.status === 'inactive' ? 'Inativo' : 'Ativo'}
                                        </Badge>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => openEdit(user)} className="p-2 text-gray-400 hover:text-[#0a0a0a] dark:hover:text-white hover:bg-indigo-50 dark:hover:bg-white/10 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDeleteClick(user)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Load More Button */}
                {hasMore && users.length > 0 && (
                    <div className="p-4 flex justify-center border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <Button
                            variant="secondary"
                            onClick={loadMoreUsers}
                            disabled={loadingMore}
                            className="flex items-center gap-2 rounded-full px-6"
                        >
                            {loadingMore ? 'Carregando...' : 'Carregar mais alunos'}
                            {!loadingMore && <ChevronDown size={18} />}
                        </Button>
                    </div>
                )}
            </Card>

            {/* Modal CSV */}
            {showCSVModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-[500px] shadow-2xl">
                        <h3 className="text-lg font-bold mb-4 dark:text-white">Importação em Massa</h3>
                        <p className="text-sm text-gray-500 mb-2">Formato: Nome, Email, ID_Turma</p>
                        <textarea className="w-full h-40 border dark:border-gray-600 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-700 dark:text-white font-mono text-sm" placeholder="João Silva, joao@email.com, turma-beta&#10;Maria Souza, maria@email.com, turma-beta" value={csvData} onChange={e => setCsvData(e.target.value)}></textarea>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button variant="ghost" onClick={() => setShowCSVModal(false)}>Cancelar</Button>
                            <Button onClick={handleBulkImport} disabled={loading}>{loading ? 'Importando...' : 'Processar CSV'}</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Create/Edit */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-[400px] shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold mb-4 dark:text-white">{modalMode === 'create' ? 'Novo Usuário' : 'Editar Usuário'}</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nome Completo</label>
                                <input type="text" placeholder="Nome" className="w-full border dark:border-gray-600 rounded-lg p-2.5 dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">E-mail de Acesso</label>
                                <input type="email" placeholder="Email" className="w-full border dark:border-gray-600 rounded-lg p-2.5 dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Senha</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Senha"
                                        className="w-full border dark:border-gray-600 rounded-lg p-2.5 pr-10 dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Função</label>
                                <select
                                    className="w-full border dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="student">Aluno</option>
                                    <option value="teacher">Professor</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                                <select
                                    className="w-full border dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="active">Ativo</option>
                                    <option value="inactive">Inativo (Bloqueado)</option>
                                </select>
                            </div>

                            {formData.role === 'student' && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Turma</label>
                                    <select
                                        className="w-full border dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={formData.turmaId}
                                        onChange={e => setFormData({ ...formData, turmaId: e.target.value })}
                                    >
                                        <option value="">Selecione a Turma...</option>
                                        {turmas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
                            <Button onClick={handleSaveUser} disabled={loading}>{loading ? 'Salvando...' : modalMode === 'create' ? 'Criar Usuário' : 'Salvar Alterações'}</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-700 scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="text-lg font-bold dark:text-white">Excluir Usuário?</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                                Você está prestes a excluir <strong>"{userToDelete?.name}"</strong>.
                                <br />Esta ação é irreversível.
                            </p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-lg shadow-red-500/20"
                            >
                                Sim, Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
