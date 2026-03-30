import React from 'react';
import { BookOpen, BarChart3, Users, Folder, GraduationCap, Award, LogOut, Sun, Moon, MessageSquare, Video, ShoppingBag, Eye, EyeOff, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { LogoFull } from '../common/Logo';

const NavItem = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${active ? 'bg-[#0a0a0a] text-white dark:bg-white dark:text-[#0a0a0a] shadow-md font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] hover:text-gray-900 dark:hover:text-white'}`}>
        {React.cloneElement(icon, { size: 22 })}<span className="block md:hidden lg:block truncate">{label}</span>
    </button>
);

export const Sidebar = ({ view, adminTab, setAdminTab, studentTab, setStudentTab, previewMode, setPreviewMode, isMobileMenuOpen, setIsMobileMenuOpen }) => {
    const { currentUser, logout } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <aside className={`fixed inset-y-0 left-0 z-50 md:sticky md:top-0 md:z-auto h-screen w-64 md:w-20 lg:w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-transform duration-300 md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl md:shadow-none' : '-translate-x-full'}`}>
                <div className="p-6 flex items-center justify-between lg:justify-start">
                    <div className="block md:hidden lg:block">
                        <LogoFull className="w-8 h-8" textSize="text-xl" />
                    </div>
                    <div className="hidden md:block lg:hidden mx-auto">
                        {/* Mini Logo for collapsed state */}
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                            E
                        </div>
                    </div>
                </div>
                <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto w-full">
                    {view === 'admin' ? (
                        <>
                            <NavItem icon={<BarChart3 />} label="Dashboard" active={adminTab === 'dashboard'} onClick={() => setAdminTab('dashboard')} />
                            <NavItem icon={<Users />} label="Alunos" active={adminTab === 'students'} onClick={() => setAdminTab('students')} />
                            <NavItem icon={<Folder />} label="Conteúdo" active={adminTab === 'content'} onClick={() => setAdminTab('content')} />
                            <NavItem icon={<LinkIcon />} label="Links de Inscrição" active={adminTab === 'invites'} onClick={() => setAdminTab('invites')} />
                            <NavItem icon={<Video />} label="Aulas Ao Vivo" active={adminTab === 'live'} onClick={() => setAdminTab('live')} />
                            <NavItem icon={<ShoppingBag />} label="Loja / Vitrine" active={adminTab === 'products'} onClick={() => setAdminTab('products')} />
                            <NavItem icon={<MessageSquare />} label="Comentários" active={adminTab === 'comments'} onClick={() => setAdminTab('comments')} />
                            <NavItem icon={<Users />} label="Comunidade VIP" active={adminTab === 'community'} onClick={() => setAdminTab('community')} />
                        </>
                    ) : (
                        <>
                            <NavItem icon={<GraduationCap />} label="Meus Cursos" active={studentTab === 'courses'} onClick={() => setStudentTab('courses')} />
                            <NavItem icon={<Video />} label="Aulas Ao Vivo" active={studentTab === 'live'} onClick={() => setStudentTab('live')} />
                            <NavItem icon={<ShoppingBag />} label="Vitrine" active={studentTab === 'products'} onClick={() => setStudentTab('products')} />
                            <NavItem icon={<Award />} label="Certificados" active={studentTab === 'certificates'} onClick={() => setStudentTab('certificates')} />
                            <NavItem icon={<Users />} label="Comunidade" active={studentTab === 'community'} onClick={() => setStudentTab('community')} />
                        </>
                    )}
                </nav>
                {/* Toggle Visitor Mode for Admins Only */}
                {currentUser?.role === 'admin' && (
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 pb-safe md:pb-4">
                        <button
                            onClick={() => setPreviewMode(!previewMode)}
                            className={`w-full flex items-center justify-center lg:justify-start gap-3 p-3 rounded-xl transition-all border ${previewMode
                                ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-900/50 dark:text-amber-400 dark:hover:bg-amber-900/40'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'
                                }`}
                        >
                            {previewMode ? <EyeOff size={20} className="shrink-0" /> : <Eye size={20} className="shrink-0" />}
                            <span className="block md:hidden lg:block font-medium text-sm truncate">
                                {previewMode ? 'Voltar para Admin' : 'Ver como Aluno'}
                            </span>
                        </button>
                    </div>
                )}
            </aside>
        </>
    );
};
