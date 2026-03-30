import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, Moon, Sun, User, LogOut, Menu } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { AdminProfileModal } from '../admin/AdminProfileModal';

export const Header = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
    const { isDark, toggleTheme } = useTheme();
    const { currentUser, logout } = useAuth();
    const { notifications, unreadCount, markAsRead } = useNotification();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showNotifMenu, setShowNotifMenu] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);

    const notifRef = useRef(null);
    const userRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifMenu(false);
            }
            if (userRef.current && !userRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error(error);
        }
    };

    const handleBellClick = () => {
        setShowNotifMenu(!showNotifMenu);
        setShowUserMenu(false);
    };

    return (
        <header className="h-20 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between transition-colors">
            {/* Mobile Menu Button */}
            <div className="flex md:hidden mr-4">
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-[#262626] rounded-lg transition-colors"
                >
                    <Menu size={24} />
                </button>
            </div>


            {/* Actions */}
            <div className="flex items-center gap-4 ml-auto">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#262626] text-gray-500 dark:text-gray-400 transition-colors"
                    title={isDark ? "Modo Claro" : "Modo Escuro"}
                >
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={handleBellClick}
                        className="p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#262626] text-gray-500 dark:text-gray-400 transition-colors relative"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>
                        )}
                    </button>

                    {/* Dropdown Notificações */}
                    {showNotifMenu && (
                        <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in fade-in slide-in-from-top-2">
                            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                                <h3 className="font-bold text-gray-900 dark:text-white text-sm">Notificações</h3>
                                {unreadCount > 0 && <span className="bg-indigo-100 dark:bg-white/10 text-indigo-600 dark:text-indigo-400 text-xs px-2 py-0.5 rounded-full font-bold">{unreadCount} novas</span>}
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500 text-sm">
                                        Nenhuma notificação por enquanto.
                                    </div>
                                ) : (
                                    notifications.filter(n => !n.read).map(notif => (
                                        <div
                                            key={notif.id}
                                            onClick={() => markAsRead(notif.id, notif.isGlobal)}
                                            className={`p-4 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#262626] transition-colors cursor-pointer bg-indigo-50/50 dark:bg-white/10 border-l-2 border-l-indigo-500`}
                                        >
                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{notif.title}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{notif.message}</p>
                                            <span className="text-[10px] text-gray-400 mt-2 block">
                                                {notif.createdAt?.seconds ? new Date(notif.createdAt.seconds * 1000).toLocaleDateString() : 'Agora'}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* User Profile */}
                <div className="relative" ref={userRef}>
                    <button
                        onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifMenu(false); }}
                        className={`flex items-center gap-3 pl-2 pr-1 py-1 rounded-full transition-all border ${showUserMenu ? 'bg-gray-50 dark:bg-gray-800 border-indigo-500/30 ring-4 ring-indigo-500/10' : 'border-transparent hover:bg-gray-50 dark:hover:bg-[#262626] hover:border-gray-200 dark:hover:border-gray-700'}`}
                    >
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{currentUser?.name || "Usuário"}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser?.role === 'admin' ? 'Administrador' : 'Aluno'}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 ring-2 ring-white dark:ring-gray-900">
                            {currentUser?.avatar ? <img src={currentUser.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" /> : currentUser?.name?.charAt(0) || "U"}
                        </div>
                    </button>

                    {/* Dropdown User */}
                    {showUserMenu && (
                        <div className="absolute top-full right-0 mt-3 w-72 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 origin-top-right">
                            {/* Dropdown Header */}
                            <div className="p-5 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                                        {currentUser?.avatar ? <img src={currentUser.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" /> : currentUser?.name?.charAt(0) || "U"}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-bold text-gray-900 dark:text-white truncate" title={currentUser?.name}>{currentUser?.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={currentUser?.email}>{currentUser?.email}</p>
                                        <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-100 dark:bg-white/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider rounded-full">
                                            {currentUser?.role === 'admin' ? 'Administrador' : 'Aluno'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Dropdown Actions */}
                            <div className="p-2 space-y-1">
                                <button
                                    onClick={() => { setShowProfileModal(true); setShowUserMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-white/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all group"
                                >
                                    <div className="p-2 bg-gray-100 dark:bg-gray-800 group-hover:bg-indigo-100 dark:group-hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-400 group-hover:text-[#0a0a0a] dark:group-hover:text-white dark:group-hover:text-indigo-400 transition-colors">
                                        <User size={18} />
                                    </div>
                                    <div className="text-left">
                                        <p className="leading-none">Meu Perfil</p>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-normal">Gerencie seus dados</p>
                                    </div>
                                </button>

                                <div className="h-px bg-gray-100 dark:bg-gray-800 mx-4 my-1"></div>

                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 dark:hover:text-red-400 transition-all group"
                                >
                                    <div className="p-2 bg-gray-100 dark:bg-gray-800 group-hover:bg-red-100 dark:group-hover:bg-red-900/20 rounded-lg text-gray-500 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                                        <LogOut size={18} />
                                    </div>
                                    <div className="text-left">
                                        <p className="leading-none">Sair da Conta</p>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-normal">Encerrar sessão atual</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showProfileModal && <AdminProfileModal onClose={() => setShowProfileModal(false)} />}
        </header>
    );
};
