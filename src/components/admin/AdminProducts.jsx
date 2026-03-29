import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Trash2, Edit2, ExternalLink, Image as ImageIcon, Check, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';
import { deleteProduct, listProducts, saveProduct } from '../../services/productService';
import { validateProductForm } from '../../utils/validation';

export const AdminProducts = () => {
    const { toast } = useToast();
    const [products, setProducts] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        image: '',
        link: ''
    });

    useEffect(() => {
        let mounted = true;
        const fetchProducts = async () => {
            try {
                const data = await listProducts({ forceRefresh: true });
                if (mounted) setProducts(data);
            } catch (error) {
                console.error("Error loading products:", error);
            }
        };

        fetchProducts();
        return () => { mounted = false; };
    }, []);

    const refreshProducts = async () => {
        const data = await listProducts({ forceRefresh: true });
        setProducts(data);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationError = validateProductForm(formData);
        if (validationError) {
            toast.error(validationError);
            return;
        }

        setLoading(true);
        try {
            const productData = {
                ...formData,
                price: formData.price || 'Grátis'
            };

            await saveProduct({
                id: editingProduct?.id || null,
                data: productData
            });

            toast.success(editingProduct ? "Produto atualizado!" : "Produto criado!");
            await refreshProducts();
            closeModal();
        } catch (error) {
            console.error("Error saving product:", error);
            toast.error("Erro ao salvar produto.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Tem certeza que deseja excluir este produto?")) {
            try {
                await deleteProduct(id);
                await refreshProducts();
                toast.success("Produto excluído.");
            } catch (error) {
                console.error("Error deleting product:", error);
                toast.error("Erro ao excluir.");
            }
        }
    };

    const openModal = (product = null) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                title: product.title,
                description: product.description || '',
                price: product.price || '',
                image: product.image || '',
                link: product.link
            });
        } else {
            setEditingProduct(null);
            setFormData({ title: '', description: '', price: '', image: '', link: '' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ShoppingBag className="text-indigo-600" /> Loja / Vitrine
                    </h2>
                    <p className="text-gray-500 mt-2">Gerencie os produtos que aparecerão para os alunos.</p>
                </div>
                <Button onClick={() => openModal()}>
                    <Plus size={20} className="mr-2" /> Novo Produto
                </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                        Nenhum produto cadastrado.
                    </div>
                ) : (
                    products.map(product => (
                        <div key={product.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                            <div className="h-48 bg-gray-100 dark:bg-gray-900 relative overflow-hidden">
                                {product.image ? (
                                    <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <ImageIcon size={48} />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openModal(product)} className="p-2 bg-white/90 text-gray-700 rounded-lg hover:bg-white shadow-sm">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(product.id)} className="p-2 bg-red-500/90 text-white rounded-lg hover:bg-red-600 shadow-sm">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="p-5">
                                <div className="flex justify-between items-start gap-2 mb-2">
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white line-clamp-1" title={product.title}>{product.title}</h3>
                                    <span className="text-sm font-medium px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg whitespace-nowrap">
                                        {product.price}
                                    </span>
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 line-clamp-2 h-10">
                                    {product.description || "Sem descrição."}
                                </p>
                                <a
                                    href={product.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block w-full text-center py-2.5 bg-gray-50 dark:bg-gray-700/50 text-indigo-600 dark:text-indigo-400 font-medium rounded-lg hover:bg-indigo-50 dark:hover:bg-white/10 transition-colors"
                                >
                                    Ver Link <ExternalLink size={14} className="inline ml-1" />
                                </a>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Produto</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-2 border dark:border-gray-600 rounded-xl dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Ex: Ebook de IA"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Simples Descrição</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2 border dark:border-gray-600 rounded-xl dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24"
                                    placeholder="Um resumo breve sobre o produto..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preço (Texto)</label>
                                    <input
                                        type="text"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full px-4 py-2 border dark:border-gray-600 rounded-xl dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Ex: R$ 97,00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capa (URL da Imagem)</label>
                                    <input
                                        type="url"
                                        value={formData.image}
                                        onChange={e => setFormData({ ...formData, image: e.target.value })}
                                        className="w-full px-4 py-2 border dark:border-gray-600 rounded-xl dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link de Venda/Acesso</label>
                                <input
                                    type="url"
                                    required
                                    value={formData.link}
                                    onChange={e => setFormData({ ...formData, link: e.target.value })}
                                    className="w-full px-4 py-2 border dark:border-gray-600 rounded-xl dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="https://checkout..."
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <Button type="button" variant="ghost" onClick={closeModal}>Cancelar</Button>
                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Salvando...' : 'Salvar Produto'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
