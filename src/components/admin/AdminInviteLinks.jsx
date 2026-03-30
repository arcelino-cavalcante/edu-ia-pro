import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getCountFromServer,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    where,
    updateDoc
} from 'firebase/firestore';
import { Copy, Link as LinkIcon, Plus, Trash2, Users, Calendar, Power } from 'lucide-react';
import { db } from '../../lib/firebase';
import {
    INVITE_LINKS_FALLBACK_PATH,
    INVITE_LINKS_PRIMARY_PATH,
    isPermissionDeniedError,
    keyToPath,
    pathToKey
} from '../../lib/inviteLinks';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

const createInviteCode = () => {
    const random = Math.random().toString(36).slice(2, 8);
    return `convite-${Date.now().toString(36)}-${random}`;
};

const toDateInputValue = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getAccessLabel = (invite) => {
    if ((invite.allowedCourseIds || []).length > 0) {
        return `${invite.allowedCourseIds.length} curso(s)`;
    }
    if ((invite.allowedTrailIds || []).length > 0) {
        return `${invite.allowedTrailIds.length} trilha(s)`;
    }
    return 'Turma completa';
};

const getUsageLabel = (invite) => {
    const used = invite.usedCount || 0;
    const max = invite.maxUses || 0;
    if (!max) return `${used} uso(s)`;
    return `${used}/${max} uso(s)`;
};

const PRIMARY_INVITE_PATH_KEY = pathToKey(INVITE_LINKS_PRIMARY_PATH);
const FALLBACK_INVITE_PATH_KEY = pathToKey(INVITE_LINKS_FALLBACK_PATH);

const getInviteCollectionRef = (pathKey) => collection(db, ...keyToPath(pathKey));
const mapInviteDocs = (snapshot, pathKey) => snapshot.docs.map((inviteDoc) => ({
    id: inviteDoc.id,
    _sourcePathKey: pathKey,
    ...inviteDoc.data()
}));

export const AdminInviteLinks = ({ structure }) => {
    const { currentUser } = useAuth();
    const { toast } = useToast();

    const [invites, setInvites] = useState([]);
    const [inviteUsageMap, setInviteUsageMap] = useState({});
    const [inviteSourcePathKey, setInviteSourcePathKey] = useState(PRIMARY_INVITE_PATH_KEY);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        turmaId: '',
        accessType: 'turma',
        selectedTrailIds: [],
        selectedCourseIds: [],
        maxUses: '',
        expiresAt: ''
    });

    const loadInvites = useCallback(async () => {
        setLoading(true);
        try {
            const primaryQuery = query(getInviteCollectionRef(PRIMARY_INVITE_PATH_KEY), orderBy('createdAt', 'desc'));
            const primarySnap = await getDocs(primaryQuery);
            setInvites(mapInviteDocs(primarySnap, PRIMARY_INVITE_PATH_KEY));
            setInviteSourcePathKey(PRIMARY_INVITE_PATH_KEY);
        } catch (error) {
            if (isPermissionDeniedError(error)) {
                try {
                    const fallbackQuery = query(getInviteCollectionRef(FALLBACK_INVITE_PATH_KEY), orderBy('createdAt', 'desc'));
                    const fallbackSnap = await getDocs(fallbackQuery);
                    setInvites(mapInviteDocs(fallbackSnap, FALLBACK_INVITE_PATH_KEY));
                    setInviteSourcePathKey(FALLBACK_INVITE_PATH_KEY);
                } catch (fallbackError) {
                    console.error('Erro ao carregar convites (fallback):', fallbackError);
                    setInvites([]);
                }
            } else {
                console.error('Erro ao carregar convites:', error);
                setInvites([]);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadInvites();
    }, [loadInvites]);

    const runInviteWrite = async (operation, preferredPathKey = inviteSourcePathKey) => {
        const candidatePaths = [...new Set([
            preferredPathKey,
            PRIMARY_INVITE_PATH_KEY,
            FALLBACK_INVITE_PATH_KEY
        ])];

        let lastPermissionError = null;

        for (const pathKey of candidatePaths) {
            try {
                const result = await operation(pathKey);
                setInviteSourcePathKey(pathKey);
                return result;
            } catch (error) {
                if (!isPermissionDeniedError(error)) throw error;
                lastPermissionError = error;
            }
        }

        throw lastPermissionError || new Error('Sem permissão para salvar convites.');
    };

    const runInviteMutation = async (invite, mutation) => {
        const preferredPath = invite?._sourcePathKey || inviteSourcePathKey;
        const candidatePaths = [...new Set([
            preferredPath,
            PRIMARY_INVITE_PATH_KEY,
            FALLBACK_INVITE_PATH_KEY
        ])];

        let lastPermissionError = null;

        for (const pathKey of candidatePaths) {
            try {
                await mutation(pathKey);
                setInviteSourcePathKey(pathKey);
                return;
            } catch (error) {
                const errorMessage = String(error?.message || '').toLowerCase();
                const isNotFound = error?.code === 'not-found' || errorMessage.includes('no document to update');
                if (isNotFound) continue;
                if (!isPermissionDeniedError(error)) throw error;
                lastPermissionError = error;
            }
        }

        throw lastPermissionError || new Error('Não foi possível atualizar o convite.');
    };

    useEffect(() => {
        const loadUsageCounts = async () => {
            if (!invites.length) {
                setInviteUsageMap({});
                return;
            }

            try {
                const counts = await Promise.all(invites.map(async (invite) => {
                    if (Number.isFinite(Number(invite.usedCount)) && Number(invite.usedCount) >= 0) {
                        return [invite.id, Number(invite.usedCount)];
                    }

                    const usageQuery = query(
                        collection(db, 'users'),
                        where('invitedByLinkId', '==', invite.id)
                    );
                    const usageSnap = await getCountFromServer(usageQuery);
                    return [invite.id, usageSnap.data().count || 0];
                }));

                setInviteUsageMap(Object.fromEntries(counts));
            } catch (error) {
                console.error('Erro ao carregar uso dos convites:', error);
            }
        };

        loadUsageCounts();
    }, [invites]);

    const turmas = useMemo(() => {
        return structure.filter((item) => item.type === 'turma');
    }, [structure]);

    const selectedTurma = useMemo(() => {
        return turmas.find((t) => t.id === formData.turmaId) || null;
    }, [turmas, formData.turmaId]);

    const availableTrails = selectedTurma?.children || [];

    const availableCourses = useMemo(() => {
        return availableTrails.flatMap((trail) => {
            return (trail.children || []).map((course) => ({
                ...course,
                trailId: trail.id,
                trailName: trail.name
            }));
        });
    }, [availableTrails]);

    const handleTurmaChange = (turmaId) => {
        setFormData((prev) => ({
            ...prev,
            turmaId,
            selectedTrailIds: [],
            selectedCourseIds: []
        }));
    };

    const toggleTrail = (trailId) => {
        setFormData((prev) => {
            const exists = prev.selectedTrailIds.includes(trailId);
            return {
                ...prev,
                selectedTrailIds: exists
                    ? prev.selectedTrailIds.filter((id) => id !== trailId)
                    : [...prev.selectedTrailIds, trailId]
            };
        });
    };

    const toggleCourse = (courseId) => {
        setFormData((prev) => {
            const exists = prev.selectedCourseIds.includes(courseId);
            return {
                ...prev,
                selectedCourseIds: exists
                    ? prev.selectedCourseIds.filter((id) => id !== courseId)
                    : [...prev.selectedCourseIds, courseId]
            };
        });
    };

    const resetForm = () => {
        setFormData({
            name: '',
            turmaId: '',
            accessType: 'turma',
            selectedTrailIds: [],
            selectedCourseIds: [],
            maxUses: '',
            expiresAt: ''
        });
    };

    const handleCreateInvite = async () => {
        if (!formData.name.trim()) {
            toast.error('Informe um nome para o link.');
            return;
        }
        if (!formData.turmaId) {
            toast.error('Selecione uma turma.');
            return;
        }
        if (formData.accessType === 'trilha' && formData.selectedTrailIds.length === 0) {
            toast.error('Selecione pelo menos uma trilha.');
            return;
        }
        if (formData.accessType === 'curso' && formData.selectedCourseIds.length === 0) {
            toast.error('Selecione pelo menos um curso.');
            return;
        }

        setSaving(true);
        try {
            const turma = turmas.find((t) => t.id === formData.turmaId);
            const selectedTrails = availableTrails.filter((trail) => formData.selectedTrailIds.includes(trail.id));
            const selectedCourses = availableCourses.filter((course) => formData.selectedCourseIds.includes(course.id));

            const maxUses = formData.maxUses ? Number(formData.maxUses) : 0;
            const expiresDate = formData.expiresAt ? new Date(`${formData.expiresAt}T23:59:59`) : null;

            await runInviteWrite((pathKey) => addDoc(getInviteCollectionRef(pathKey), {
                name: formData.name.trim(),
                code: createInviteCode(),
                status: 'active',
                turmaId: turma.id,
                turmaName: turma.name,
                allowedTrailIds: formData.accessType === 'trilha' ? selectedTrails.map((trail) => trail.id) : [],
                allowedTrailNames: formData.accessType === 'trilha' ? selectedTrails.map((trail) => trail.name) : [],
                allowedCourseIds: formData.accessType === 'curso' ? selectedCourses.map((course) => course.id) : [],
                allowedCourseNames: formData.accessType === 'curso' ? selectedCourses.map((course) => course.name) : [],
                maxUses,
                usedCount: 0,
                expiresAt: expiresDate,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: currentUser?.id || null
            }));
            await loadInvites();

            resetForm();
            toast.success('Link de convite criado com sucesso.');
        } catch (error) {
            console.error('Erro ao criar convite:', error);
            toast.error('Não foi possível criar o link de convite.');
        } finally {
            setSaving(false);
        }
    };

    const copyInviteLink = (invite) => {
        const link = `https://arcelino-cavalcante.github.io/edu-ia-pro/?invite=${invite.code}`;
        navigator.clipboard.writeText(link).then(() => {
            toast.success('Link copiado para área de transferência.');
        }).catch(() => {
            toast.error('Não foi possível copiar o link.');
        });
    };

    const toggleInviteStatus = async (invite) => {
        try {
            await runInviteMutation(invite, (pathKey) => updateDoc(
                doc(db, ...keyToPath(pathKey), invite.id),
                {
                    status: invite.status === 'active' ? 'inactive' : 'active',
                    updatedAt: serverTimestamp()
                }
            ));
            await loadInvites();
            toast.success(invite.status === 'active' ? 'Convite desativado.' : 'Convite ativado.');
        } catch (error) {
            console.error('Erro ao atualizar status do convite:', error);
            toast.error('Não foi possível atualizar o status.');
        }
    };

    const deleteInvite = async (invite) => {
        if (!window.confirm(`Deseja remover o convite "${invite.name}"?`)) return;
        try {
            await runInviteMutation(invite, (pathKey) => deleteDoc(
                doc(db, ...keyToPath(pathKey), invite.id)
            ));
            await loadInvites();
            toast.success('Convite removido.');
        } catch (error) {
            console.error('Erro ao remover convite:', error);
            toast.error('Não foi possível remover o convite.');
        }
    };

    return (
        <div className="p-8 space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Links de Inscrição</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Crie links para o usuário se cadastrar e já entrar com acesso automático.</p>
            </div>

            <Card className="p-6 border dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Novo Link de Convite</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nome do Convite</label>
                        <input
                            type="text"
                            placeholder="Ex: Acesso gratuito - turma IA Abril"
                            className="w-full border dark:border-gray-600 rounded-lg p-2.5 outline-none dark:bg-gray-700 dark:text-white"
                            value={formData.name}
                            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Turma</label>
                        <select
                            className="w-full border dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 dark:text-white outline-none"
                            value={formData.turmaId}
                            onChange={(e) => handleTurmaChange(e.target.value)}
                        >
                            <option value="">Selecione...</option>
                            {turmas.map((turma) => (
                                <option key={turma.id} value={turma.id}>{turma.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Escopo de Acesso</label>
                        <select
                            className="w-full border dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 dark:text-white outline-none"
                            value={formData.accessType}
                            onChange={(e) => setFormData((prev) => ({
                                ...prev,
                                accessType: e.target.value,
                                selectedTrailIds: [],
                                selectedCourseIds: []
                            }))}
                        >
                            <option value="turma">Turma Completa</option>
                            <option value="trilha">Trilhas Selecionadas</option>
                            <option value="curso">Cursos Selecionados</option>
                        </select>
                    </div>

                    {formData.accessType === 'trilha' && (
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Selecione as Trilhas</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50 max-h-44 overflow-y-auto">
                                {availableTrails.length === 0 && <p className="text-sm text-gray-500">Nenhuma trilha disponível para esta turma.</p>}
                                {availableTrails.map((trail) => (
                                    <label key={trail.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                        <input
                                            type="checkbox"
                                            checked={formData.selectedTrailIds.includes(trail.id)}
                                            onChange={() => toggleTrail(trail.id)}
                                        />
                                        {trail.name}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {formData.accessType === 'curso' && (
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Selecione os Cursos</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50 max-h-52 overflow-y-auto">
                                {availableCourses.length === 0 && <p className="text-sm text-gray-500">Nenhum curso disponível para esta turma.</p>}
                                {availableCourses.map((course) => (
                                    <label key={course.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                        <input
                                            type="checkbox"
                                            checked={formData.selectedCourseIds.includes(course.id)}
                                            onChange={() => toggleCourse(course.id)}
                                        />
                                        <span className="truncate">{course.name}</span>
                                        <span className="text-xs text-gray-400">({course.trailName})</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Limite de usos (opcional)</label>
                        <input
                            type="number"
                            min="0"
                            placeholder="0 = ilimitado"
                            className="w-full border dark:border-gray-600 rounded-lg p-2.5 outline-none dark:bg-gray-700 dark:text-white"
                            value={formData.maxUses}
                            onChange={(e) => setFormData((prev) => ({ ...prev, maxUses: e.target.value }))}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Expira em (opcional)</label>
                        <input
                            type="date"
                            className="w-full border dark:border-gray-600 rounded-lg p-2.5 outline-none dark:bg-gray-700 dark:text-white"
                            min={toDateInputValue(new Date())}
                            value={formData.expiresAt}
                            onChange={(e) => setFormData((prev) => ({ ...prev, expiresAt: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="mt-5 flex justify-end">
                    <Button onClick={handleCreateInvite} disabled={saving}>
                        <Plus size={16} />
                        {saving ? 'Criando...' : 'Criar Link'}
                    </Button>
                </div>
            </Card>

            <div className="mt-8 flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Convites Criados</h3>
                <span className="text-sm text-gray-500">{invites.length} convite(s)</span>
            </div>

            {loading ? (
                <div className="w-full text-center py-12 text-gray-500 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                    Carregando convites...
                </div>
            ) : invites.length === 0 ? (
                <div className="w-full text-center py-12 text-gray-500 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
                    Nenhum convite criado ainda.
                </div>
            ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {invites.map((invite) => (
                        <div key={invite.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden">
                            {invite.status !== 'active' && (
                                <div className="absolute inset-0 bg-gray-50/50 dark:bg-gray-900/60 z-10 pointer-events-none" />
                            )}
                            <div className="relative z-20">
                                <div className="flex items-start justify-between gap-2 mb-3">
                                    <h4 className="font-bold text-gray-900 dark:text-white line-clamp-2 text-lg">{invite.name}</h4>
                                    <Badge color={invite.status === 'active' ? 'green' : 'gray'}>
                                        {invite.status === 'active' ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                </div>
                                
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 mb-4 mt-2">
                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono break-all line-clamp-2">
                                        {`https://arcelino-cavalcante.github.io/edu-ia-pro/?invite=${invite.code}`}
                                    </p>
                                </div>
                                
                                <div className="space-y-2 mb-6">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Users size={16} className="text-indigo-500" />
                                        <span className="truncate" title={invite.turmaName || invite.turmaId}>{invite.turmaName || invite.turmaId}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <LinkIcon size={16} className="text-indigo-500" />
                                        <span className="truncate">{getAccessLabel(invite)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${inviteUsageMap[invite.id] >= invite.maxUses && invite.maxUses > 0 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'}`}>
                                            {getUsageLabel({ ...invite, usedCount: inviteUsageMap[invite.id] || 0 })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Calendar size={16} className={invite.expiresAt ? "text-indigo-500" : "text-gray-400"} />
                                        <span>
                                            {invite.expiresAt ? `Expira em ${new Date(invite.expiresAt.seconds ? invite.expiresAt.seconds * 1000 : invite.expiresAt).toLocaleDateString()}` : 'Sem expiração'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="relative z-20 flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <Button size="sm" variant="ghost" className="text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 flex-1 justify-center" onClick={() => copyInviteLink(invite)}>
                                    <Copy size={16} className="mr-2"/> Copiar
                                </Button>
                                <Button size="sm" variant="ghost" className={`text-gray-500 flex-none px-3 ${invite.status === 'active' ? 'hover:text-orange-600 hover:bg-orange-50 dark:hover:text-orange-400 dark:hover:bg-orange-900/30' : 'hover:text-green-600 hover:bg-green-50 dark:hover:text-green-400 dark:hover:bg-green-900/30'}`} onClick={() => toggleInviteStatus(invite)} title={invite.status === 'active' ? 'Desativar Link' : 'Ativar Link'}>
                                    <Power size={18} />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex-none px-3" onClick={() => deleteInvite(invite)} title="Excluir Convite">
                                    <Trash2 size={18} />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
