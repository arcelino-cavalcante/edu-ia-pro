import React, { useState } from 'react';
import { Users, Folder, BookOpen, FileVideo, FileQuestion, Plus, ChevronRight, Copy, Edit2, Trash2, Video, File, Image as ImageIcon, X } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';
import { invalidateStructureCache, saveStructureItem, deleteStructureItem, publishMegaCatalog } from '../../services/structureService';

export const StructureManager = ({ structure, setStructure }) => {
    const [currentPath, setCurrentPath] = useState([]);
    const [modalMode, setModalMode] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        name: '', description: '', videoId: '', duration: '', materialsName: '', materialsUrl: '', coverImageFile: null, coverImagePreview: null,
        itemType: 'aula', // 'aula' ou 'quiz' na hora de criar aula
        questions: [], minScore: 70,
        dripDays: 0, prerequisiteModuleId: ''
    });
    const [loading, setLoading] = useState(false);

    // Delete Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const { toast } = useToast();

    const currentItems = currentPath.reduce((acc, curr) => acc.find(item => item.id === curr.id)?.children || [], structure);

    const getNextType = () => {
        const depth = currentPath.length;
        if (depth === 0) return 'turma';
        if (depth === 1) return 'trilha';
        if (depth === 2) return 'curso';
        if (depth === 3) return 'modulo';
        return formData.itemType || 'aula'; // dynamic leaf type
    };

    // Clone Structure
    const handleDuplicate = async (item) => {
        setLoading(true);

        const generateNewIds = (node) => {
            return {
                ...node,
                id: `${node.type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                children: node.children ? node.children.map(generateNewIds) : []
            };
        };

        const newItem = generateNewIds({ ...item, name: `${item.name} (Cópia)` });

        try {
            if (currentPath.length === 0) {
                // Recursive save using atomic operations
                const recursiveSave = async (node, path) => {
                    await saveStructureItem(node, path, node.order || 0);
                    const newPath = [...path, node];
                    for (const child of node.children || []) {
                        await recursiveSave(child, newPath);
                    }
                };
                
                await recursiveSave(newItem, []);

                const updatedStructure = [...structure, newItem];
                invalidateStructureCache();
                setStructure(updatedStructure);
                publishMegaCatalog(updatedStructure); // Fire and Forget background build
                toast.success("Item duplicado com sucesso!");
            } else {
                alert("A duplicação aninhada requer validação de paths. Implementado apenas para raiz no momento.");
            }
        } catch (error) {
            console.error("Duplicate Error:", error);
            toast.error("Erro ao duplicar item.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name) return;
        setLoading(true);

        try {
            const materials = editingItem?.materials ? [...editingItem.materials] : [];
            if (formData.materialsName && formData.materialsUrl) {
                materials.push({ name: formData.materialsName, url: formData.materialsUrl });
            }

            let coverImageUrl = editingItem?.coverImage || null;
            if (formData.coverImageFile) {
                const imageRef = ref(storage, `covers/${Date.now()}_${formData.coverImageFile.name}`);
                await uploadBytes(imageRef, formData.coverImageFile);
                coverImageUrl = await getDownloadURL(imageRef);
            }

            const nodeType = modalMode === 'create' ? getNextType() : editingItem.type;

            const itemToSave = {
                id: modalMode === 'create' ? `${nodeType}-${Date.now()}` : editingItem.id,
                type: nodeType,
                name: formData.name,
                description: formData.description || '',
                ...(nodeType === 'modulo' ? { dripDays: formData.dripDays, prerequisiteModuleId: formData.prerequisiteModuleId } : {}),
                ...(nodeType === 'aula' && formData.videoId ? { videoId: formData.videoId, duration: formData.duration } : {}),
                ...(nodeType === 'quiz' ? { questions: formData.questions || [], minScore: formData.minScore } : {}),
                materials: materials,
                ...(nodeType === 'curso' || nodeType === 'trilha' ? { coverImage: coverImageUrl } : {})
            }; // no children array here for atomic DB persistence

            // Calculate Order
            let newOrder = 0;
            if (modalMode === 'create') {
                 newOrder = currentItems.length;
            } else {
                 newOrder = editingItem.order || 0;
            }

            // Save to Firebase Database Automatically (Direct Document Target)
            await saveStructureItem(itemToSave, currentPath, newOrder);

            // Fast UI State Regeneration
            let newStructure = [...structure];
            const localItemFull = { ...itemToSave, children: modalMode === 'create' ? [] : (editingItem.children || []) };
            
            const updateRecursive = (items, pathIdx) => {
                if (pathIdx === currentPath.length) {
                    if (modalMode === 'create') return [...items, localItemFull];
                    return items.map(i => i.id === editingItem.id ? localItemFull : i);
                }
                return items.map(item => {
                    if (item.id === currentPath[pathIdx].id) return { ...item, children: updateRecursive(item.children, pathIdx + 1) };
                    return item;
                });
            };

            newStructure = updateRecursive(newStructure, 0);

            invalidateStructureCache(); // For next session
            setStructure(newStructure); // Real-time client UI
            publishMegaCatalog(newStructure); // Free tier massive 1-read optimization update
            toast.success("Salvo com sucesso!");

            setModalMode(null);
            setFormData({ name: '', description: '', videoId: '', duration: '', materialsName: '', materialsUrl: '', coverImageFile: null, coverImagePreview: null, itemType: 'aula', questions: [], minScore: 70, dripDays: 0, prerequisiteModuleId: '' });
        } catch (error) { 
            console.error("Save Error:", error); 
            toast.error("Erro ao salvar."); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleDeleteClick = (item) => {
        setItemToDelete(item);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;

        try {
            // Delete directly from Firebase (and cascade delete children under it)
            await deleteStructureItem(itemToDelete);

            // Reflect on UI
            let newStructure = [...structure];
            if (currentPath.length === 0) {
                newStructure = newStructure.filter(i => i.id !== itemToDelete.id);
            } else {
                const deleteRecursive = (items, pathIdx) => {
                    if (pathIdx === currentPath.length) return items.filter(i => i.id !== itemToDelete.id);
                    return items.map(item => {
                        if (item.id === currentPath[pathIdx].id) return { ...item, children: deleteRecursive(item.children, pathIdx + 1) };
                        return item;
                    });
                };
                newStructure = deleteRecursive(newStructure, 0);
            }

            setStructure(newStructure);
            invalidateStructureCache(); // Tell next page reload to fetch DB anew
            publishMegaCatalog(newStructure); // Background rebuild

            toast.success("Item removido com sucesso.");
        } catch (error) {
            console.error("Delete Error:", error);
            toast.error("Erro ao remover item.");
        } finally {
            setShowDeleteModal(false);
            setItemToDelete(null);
        }
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name, description: item.description || '', videoId: item.videoId || '', duration: item.duration || '',
            materialsName: '', materialsUrl: '', coverImageFile: null, coverImagePreview: item.coverImage || null,
            itemType: item.type, questions: item.questions || [], minScore: item.minScore || 70,
            dripDays: item.dripDays || 0, prerequisiteModuleId: item.prerequisiteModuleId || ''
        });
        setModalMode('edit');
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'turma': return <Users className="text-blue-500" />;
            case 'trilha': return <Folder className="text-emerald-500" />;
            case 'curso': return <BookOpen className="text-indigo-500" />;
            case 'modulo': return <Folder className="text-amber-500" />;
            case 'aula': return <FileVideo className="text-rose-500" />;
            case 'quiz': return <FileQuestion className="text-purple-500" />;
            default: return <Folder />;
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div><h2 className="text-2xl font-bold text-gray-800 dark:text-white">Gerenciador de Conteúdo</h2><p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Navegue e edite o curso.</p></div>
                <Button onClick={() => { setModalMode('create'); setFormData({ name: '', description: '', videoId: '', duration: '', materialsName: '', materialsUrl: '', coverImageFile: null, coverImagePreview: null, itemType: 'aula', questions: [], minScore: 70, dripDays: 0, prerequisiteModuleId: '' }); }}><Plus size={18} /> Novo Item</Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 overflow-x-auto pb-2">
                <button onClick={() => setCurrentPath([])} className="hover:text-[#0a0a0a] dark:hover:text-white font-medium dark:text-gray-400">Início</button>
                {currentPath.map((item, index) => (
                    <React.Fragment key={item.id}><ChevronRight size={14} /><button onClick={() => setCurrentPath(currentPath.slice(0, index + 1))} className={`whitespace-nowrap ${index === currentPath.length - 1 ? 'text-gray-900 dark:text-white font-bold' : 'hover:text-[#0a0a0a] dark:hover:text-white dark:text-gray-400'}`}>{item.name}</button></React.Fragment>
                ))}
            </div>
            {currentItems.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700"><p className="text-gray-500">Pasta vazia</p></div>
            ) : (
                <div className="space-y-3">
                    {currentItems.map((item) => (
                        <div key={item.id} className="group bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => (item.type !== 'aula' && item.type !== 'quiz') && setCurrentPath([...currentPath, item])}>
                                <div className={`p-3 rounded-lg bg-gray-50 dark:bg-gray-700`}>{getTypeIcon(item.type)}</div>
                                <div><h3 className="font-semibold text-gray-900 dark:text-white">{item.name}</h3><div className="flex gap-2 text-xs text-gray-500"><span className="uppercase">{item.type}</span>{item.videoId && <span className="flex items-center gap-1"><Video size={10} /> ID: {item.videoId}</span>}</div></div>
                            </div>
                            <div className="flex items-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                {currentPath.length === 0 && <button onClick={() => handleDuplicate(item)} className="p-2 text-gray-400 hover:text-emerald-600 rounded-lg" title="Duplicar"><Copy size={16} /></button>}
                                <button onClick={() => openEdit(item)} className="p-2 text-gray-400 hover:text-[#0a0a0a] dark:hover:text-white rounded-lg"><Edit2 size={16} /></button>
                                <button onClick={() => handleDeleteClick(item)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg"><Trash2 size={16} /></button>
                                {(item.type !== 'aula' && item.type !== 'quiz') && <ChevronRight size={18} className="text-gray-300 ml-2" />}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {modalMode && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full flex-1 max-w-[600px] shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold mb-4 dark:text-white">{modalMode === 'create' ? 'Novo Item' : 'Editar Item'}</h3>

                        {/* If adding an item inside a Modulo, allow changing type before it is created */}
                        {modalMode === 'create' && currentPath.length === 4 && (
                            <div className="flex gap-4 mb-4">
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium dark:text-gray-300">
                                    <input type="radio" value="aula" checked={formData.itemType === 'aula'} onChange={() => setFormData({ ...formData, itemType: 'aula' })} className="accent-indigo-600" />
                                    Vídeo-Aula
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium dark:text-gray-300">
                                    <input type="radio" value="quiz" checked={formData.itemType === 'quiz'} onChange={() => setFormData({ ...formData, itemType: 'quiz' })} className="accent-indigo-600" />
                                    Teste / Avaliação (Quiz)
                                </label>
                            </div>
                        )}

                        <div className="space-y-3">
                            <input type="text" placeholder="Nome" className="w-full border dark:border-gray-600 rounded-lg p-2.5 outline-none dark:bg-gray-700 dark:text-white" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} autoFocus />
                            <textarea placeholder="Descrição (Suporta Markdown simples)" rows={4} className="w-full border dark:border-gray-600 rounded-lg p-2.5 outline-none dark:bg-gray-700 dark:text-white text-sm" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />

                            {(modalMode === 'create' ? getNextType() : editingItem?.type) === 'modulo' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t border-gray-100 dark:border-gray-700 pt-4 mb-2">
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Liberação (Drip Content)</label>
                                        <div className="flex items-center gap-2">
                                            <input type="number" min="0" placeholder="0" className="w-20 border dark:border-gray-600 rounded-lg p-2.5 outline-none dark:bg-gray-700 dark:text-white text-sm" value={formData.dripDays} onChange={e => setFormData({ ...formData, dripDays: Number(e.target.value) })} />
                                            <span className="text-sm text-gray-500 dark:text-gray-400">dias após a matrícula</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Módulo Pré-Requisito</label>
                                        <select className="w-full border dark:border-gray-600 rounded-lg p-2.5 outline-none dark:bg-gray-700 dark:text-white text-sm" value={formData.prerequisiteModuleId} onChange={e => setFormData({ ...formData, prerequisiteModuleId: e.target.value })}>
                                            <option value="">Nenhum (Livre)</option>
                                            {currentItems.filter(i => i.type === 'modulo' && i.id !== editingItem?.id).map(mod => (
                                                <option key={mod.id} value={mod.id}>{mod.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {((modalMode === 'create' ? getNextType() : editingItem.type) === 'curso' || (modalMode === 'create' ? getNextType() : editingItem.type) === 'trilha') && (
                                <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4 mb-2">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Imagem de Capa (Opcional)</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-24 h-24 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-600">
                                            {formData.coverImagePreview ? (
                                                <img src={formData.coverImagePreview} alt="Capa" className="w-full h-full object-cover" />
                                            ) : (
                                                <ImageIcon className="text-gray-400" size={32} />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                id="cover-upload"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        setFormData({ ...formData, coverImageFile: file, coverImagePreview: URL.createObjectURL(file) });
                                                    }
                                                }}
                                            />
                                            <label htmlFor="cover-upload" className="cursor-pointer px-4 py-2 bg-indigo-50 dark:bg-white/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-white/10 rounded-lg text-sm font-medium transition-colors inline-block">
                                                Escolher Imagem
                                            </label>
                                            <p className="text-xs text-gray-500 mt-2">Recomendado: Proporção 16:9 (PNG, JPG)</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(modalMode === 'create' ? getNextType() : editingItem.type) === 'aula' && (
                                <>
                                    {/* Smart Video Input Box */}
                                    <div className="bg-indigo-50/50 dark:bg-white/5 border border-indigo-100 dark:border-indigo-800/30 rounded-xl p-4 mb-4">
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="bg-indigo-100 dark:bg-white/10 p-2 rounded-lg text-indigo-600 dark:text-indigo-400 mt-0.5">
                                                <Video size={16} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">Vídeo da Aula</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Cole abaixo o link "Compartilhar" do YouTube ou Vimeo.</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-[1fr,120px] gap-3 mb-3">
                                            <input
                                                type="text"
                                                placeholder="Ex: https://youtu.be/..."
                                                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg p-2.5 outline-none dark:bg-gray-800 dark:text-white font-mono text-sm focus:border-indigo-500 transition-colors"
                                                value={formData.videoId}
                                                onChange={e => {
                                                    const url = e.target.value;
                                                    let id = url;

                                                    // YouTube Match
                                                    const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                                                    const ytMatch = url.match(ytRegExp);

                                                    // Vimeo Match
                                                    const vimeoRegExp = /(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:[a-zA-Z0-9_\-]+)?/i;
                                                    const vimeoMatch = url.match(vimeoRegExp);

                                                    if (ytMatch && ytMatch[2].length === 11) {
                                                        id = ytMatch[2]; // Update strictly with ID for DB efficiency
                                                    } else if (vimeoMatch && vimeoMatch[1]) {
                                                        id = `vimeo-${vimeoMatch[1]}`; // Prefix Vimeo IDs to distinguish in player
                                                    }

                                                    setFormData({ ...formData, videoId: id });
                                                }}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Tempo (ex: 15:00)"
                                                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg p-2.5 outline-none dark:bg-gray-800 dark:text-white text-sm focus:border-indigo-500 transition-colors"
                                                value={formData.duration}
                                                onChange={e => setFormData({ ...formData, duration: e.target.value })}
                                            />
                                        </div>

                                        {/* Video Preview Area */}
                                        {formData.videoId && (
                                            <div className="mt-2 rounded-lg overflow-hidden bg-black/5 dark:bg-black/20 border border-gray-200 dark:border-gray-700 relative aspect-video flex items-center justify-center">
                                                {formData.videoId.startsWith('vimeo-') ? (
                                                    <div className="text-center p-4">
                                                        <Video className="mx-auto text-blue-400 mb-2" size={32} />
                                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Vídeo Vimeo Vinculado</p>
                                                        <p className="text-xs text-gray-500 mt-1">ID: {formData.videoId.replace('vimeo-', '')}</p>
                                                    </div>
                                                ) : formData.videoId.length === 11 ? (
                                                    <>
                                                        <img
                                                            src={`https://img.youtube.com/vi/${formData.videoId}/maxresdefault.jpg`}
                                                            onError={(e) => {
                                                                // Fallback to lower res if maxresdefault doesn't exist
                                                                e.target.onerror = null;
                                                                e.target.src = `https://img.youtube.com/vi/${formData.videoId}/hqdefault.jpg`;
                                                            }}
                                                            alt="Video Preview"
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                                                            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                                                                <div className="w-0 h-0 border-t-8 border-t-transparent border-l-[12px] border-l-white border-b-8 border-b-transparent ml-1"></div>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Link inválido ou não reconhecido.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Upload de Materiais Simulado */}
                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Anexar Material</label>
                                        <div className="flex gap-2">
                                            <input type="text" placeholder="Nome do Arquivo" className="flex-1 border dark:border-gray-600 rounded-lg p-2.5 text-sm dark:bg-gray-700 dark:text-white" value={formData.materialsName} onChange={e => setFormData({ ...formData, materialsName: e.target.value })} />
                                            <input type="text" placeholder="URL do PDF/Drive" className="flex-1 border dark:border-gray-600 rounded-lg p-2.5 text-sm dark:bg-gray-700 dark:text-white" value={formData.materialsUrl} onChange={e => setFormData({ ...formData, materialsUrl: e.target.value })} />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">Cole o link público do Google Drive ou Dropbox.</p>

                                        {editingItem?.materials?.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                <p className="text-xs font-bold dark:text-gray-400">Arquivos atuais:</p>
                                                {editingItem.materials.map((m, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                                        <File size={12} /> {m.name}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Quiz Form UI */}
                            {(modalMode === 'create' ? getNextType() : editingItem?.type) === 'quiz' && (
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 space-y-4">
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 block">Nota Mínima de Aprovação (%)</label>
                                        <input type="number" min="0" max="100" className="w-1/3 border dark:border-gray-600 rounded-lg p-2.5 outline-none bg-gray-50 dark:bg-gray-700 dark:text-white text-sm" value={formData.minScore} onChange={(e) => setFormData({ ...formData, minScore: Number(e.target.value) })} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-base font-bold text-gray-800 dark:text-gray-200">Perguntas</label>
                                        <Button type="button" size="sm" variant="outline" onClick={() => setFormData({ ...formData, questions: [...(formData.questions || []), { id: `q_${Date.now()}`, text: '', options: ['', '', ''], correctIndex: 0 }] })}>+ Pergunta</Button>
                                    </div>

                                    {(formData.questions || []).length === 0 && (
                                        <div className="text-center p-6 border border-dashed rounded-lg border-gray-300 dark:border-gray-700 text-gray-400 text-sm">Nenhuma pergunta neste questionário.</div>
                                    )}

                                    {(formData.questions || []).map((q, qIndex) => (
                                        <div key={q.id} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 relative">
                                            <button type="button" onClick={() => setFormData({ ...formData, questions: (formData.questions || []).filter((_, idx) => idx !== qIndex) })} className="absolute top-2 right-2 text-red-500 hover:text-red-700 opacity-60 hover:opacity-100 p-2"><Trash2 size={16} /></button>
                                            <span className="text-xs font-bold text-indigo-500 mb-2 block uppercase">Pergunta {qIndex + 1}</span>

                                            <input type="text" placeholder="Texto da Pergunta" className="w-full border-b border-gray-300 dark:border-gray-600 bg-transparent p-2 mb-3 outline-none dark:text-white font-medium" value={q.text} onChange={(e) => {
                                                const newQ = [...(formData.questions || [])];
                                                newQ[qIndex] = { ...newQ[qIndex], text: e.target.value };
                                                setFormData({ ...formData, questions: newQ });
                                            }} />

                                            <div className="space-y-2">
                                                {q.options.map((opt, oIndex) => (
                                                    <div key={oIndex} className="flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newQ = [...(formData.questions || [])];
                                                                newQ[qIndex] = { ...newQ[qIndex], correctIndex: oIndex };
                                                                setFormData({ ...formData, questions: newQ });
                                                            }}
                                                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${q.correctIndex === oIndex ? 'border-green-500 bg-green-500' : 'border-gray-400 dark:border-gray-500 hover:border-green-400'}`}
                                                            title="Marcar como alternativa correta"
                                                        >
                                                            {q.correctIndex === oIndex && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                        </button>
                                                        <input type="text" placeholder={`Alternativa ${oIndex + 1}`} className="flex-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1.5 text-sm dark:text-white outline-none" value={opt} onChange={(e) => {
                                                            const newQ = [...(formData.questions || [])];
                                                            const newOptions = [...newQ[qIndex].options];
                                                            newOptions[oIndex] = e.target.value;
                                                            newQ[qIndex] = { ...newQ[qIndex], options: newOptions };
                                                            setFormData({ ...formData, questions: newQ });
                                                        }} />
                                                        <button type="button" onClick={() => {
                                                            const newQ = [...(formData.questions || [])];
                                                            const newOptions = newQ[qIndex].options.filter((_, i) => i !== oIndex);
                                                            let newCorrectIndex = newQ[qIndex].correctIndex;
                                                            if (newCorrectIndex >= newOptions.length) newCorrectIndex = Math.max(0, newOptions.length - 1);
                                                            newQ[qIndex] = { ...newQ[qIndex], options: newOptions, correctIndex: newCorrectIndex };
                                                            setFormData({ ...formData, questions: newQ });
                                                        }} className="text-gray-400 hover:text-red-500" title="Remover Alternativa"><X size={14} /></button>
                                                    </div>
                                                ))}
                                                <button type="button" onClick={() => {
                                                    const newQ = [...(formData.questions || [])];
                                                    newQ[qIndex] = { ...newQ[qIndex], options: [...newQ[qIndex].options, ''] };
                                                    setFormData({ ...formData, questions: newQ });
                                                }} className="text-xs text-indigo-600 font-medium hover:underline ml-7 mt-1">+ Alternativa</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="ghost" onClick={() => setModalMode(null)}>Cancelar</Button>
                            <Button onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
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
                            <h3 className="text-lg font-bold dark:text-white">Excluir Item?</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                                Você está prestes a excluir <strong>"{itemToDelete?.name}"</strong>.
                                {itemToDelete?.children?.length > 0 && <span className="block mt-1 text-red-500 font-medium">Isso excluirá também {itemToDelete.children.length} sub-itens.</span>}
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
