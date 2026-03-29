import React, { useState, useEffect } from 'react';
import { ShoppingBag, ExternalLink, Tag } from 'lucide-react';
import { listProducts } from '../../services/productService';

export const StudentProducts = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const fetchProducts = async () => {
            try {
                const data = await listProducts();
                if (mounted) setProducts(data);
            } catch (error) {
                console.error("Erro ao carregar vitrine:", error);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchProducts();
        return () => { mounted = false; };
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Carregando vitrine...</div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShoppingBag className="text-indigo-600" /> Vitrine
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Recursos premium, ferramentas e cursos recomendados para você.
                </p>
            </div>

            {products.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-dashed border-gray-300 dark:border-gray-700">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-white/10 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShoppingBag size={32} />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Vitrine Vazia</h3>
                    <p className="text-gray-500 dark:text-gray-400">Em breve novidades incríveis por aqui!</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map(product => (
                        <div key={product.id} className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                            <div className="h-48 bg-gray-100 dark:bg-gray-900 relative overflow-hidden">
                                {product.image ? (
                                    <img
                                        src={product.image}
                                        alt={product.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
                                        <ShoppingBag className="text-white opacity-50" size={48} />
                                    </div>
                                )}
                                {product.price && (
                                    <div className="absolute top-3 right-3 bg-white/90 dark:bg-black/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-gray-900 dark:text-white shadow-sm">
                                        {product.price}
                                    </div>
                                )}
                            </div>

                            <div className="p-6 flex flex-col flex-1">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-[#0a0a0a] dark:group-hover:text-white transition-colors">
                                    {product.title}
                                </h3>

                                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 flex-1 line-clamp-3">
                                    {product.description || "Confira este recurso incrível que selecionamos para você."}
                                </p>

                                <a
                                    href={product.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full bg-[#0a0a0a]hover:bg-black dark:hover:bg-gray-200 dark:bg-white dark:text-[#0a0a0a]text-white font-medium py-3 rounded-xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
                                >
                                    Ver Detalhes <ExternalLink size={18} />
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
