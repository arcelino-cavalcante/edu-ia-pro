import React, { useEffect, useState } from 'react';
import { BookOpen, AlertCircle, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../common/Button';

export const LoginPage = () => {
    const { loginAdmin, loginStudent, registerStudentWithInvite, getInviteInfo } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();

    const [loginMode, setLoginMode] = useState('student');
    const [studentAction, setStudentAction] = useState('login'); // login | signup
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loading, setLoading] = useState(false);
    const [inviteCode, setInviteCode] = useState('');
    const [inviteInfo, setInviteInfo] = useState(null);
    const [inviteLoading, setInviteLoading] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const inviteFromUrl = params.get('invite');
        if (inviteFromUrl) {
            setInviteCode(inviteFromUrl);
            setLoginMode('student');
            setStudentAction('signup');
        }
    }, []);

    useEffect(() => {
        const loadInvite = async () => {
            if (!inviteCode) return;
            setInviteLoading(true);
            const info = await getInviteInfo(inviteCode);
            setInviteInfo(info);
            setInviteLoading(false);
        };
        loadInvite();
    }, [inviteCode]);

    const clearInviteFromUrl = () => {
        const url = new URL(window.location.href);
        url.searchParams.delete('invite');
        const next = `${url.pathname}${url.search}${url.hash}`;
        window.history.replaceState({}, '', next);
        setInviteCode('');
        setInviteInfo(null);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');
        setLoading(true);

        try {
            if (loginMode === 'admin') {
                await loginAdmin(email, password);
            } else {
                const canUseInvite = !!inviteCode && inviteInfo?.valid;

                if (studentAction === 'signup') {
                    if (!canUseInvite) {
                        throw new Error("Convite inválido. Solicite um novo link.");
                    }
                    if (password !== confirmPassword) {
                        throw new Error("A confirmação de senha não confere.");
                    }
                    await registerStudentWithInvite({ name, email, password, inviteCode });
                    clearInviteFromUrl();
                } else {
                    await loginStudent(email, password, canUseInvite ? inviteCode : null);
                    if (canUseInvite) {
                        clearInviteFromUrl();
                    }
                }
            }
        } catch (err) {
            console.error(err);
            if (loginMode === 'admin' && err?.code === 'auth/invalid-credential') {
                setLoginError("Credenciais de administrador inválidas. Confira e-mail/senha do Firebase Authentication.");
            } else {
                setLoginError(err?.message || (loginMode === 'admin' ? "Credenciais incorretas ou conta inexistente." : "Dados de aluno inválidos."));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`${isDarkMode ? 'dark' : ''} min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors`}>
            <div className="max-w-4xl w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-[#0a0a0a] text-white relative overflow-hidden">
                    <style>{`
                        @keyframes shimmer {
                            0% { background-position: 0% 50%; }
                            50% { background-position: 100% 50%; }
                            100% { background-position: 0% 50%; }
                        }
                        @keyframes slideUpFade {
                            0% { opacity: 0; transform: translateY(30px); filter: blur(10px); }
                            100% { opacity: 1; transform: translateY(0); filter: blur(0px); }
                        }
                        .animate-shimmer {
                            background-size: 200% auto;
                            animation: shimmer 6s linear infinite;
                        }
                        .animate-reveal {
                            animation: slideUpFade 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                        }
                    `}</style>
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1000&auto=format&fit=crop')] opacity-30 mix-blend-luminosity bg-cover bg-center filter grayscale transition-transform duration-1000 hover:scale-105"></div>
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/95 via-black/40 to-transparent z-0 pointer-events-none"></div>
                    
                    <div className="relative z-10 flex flex-col justify-end h-full animate-reveal">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                                <BookOpen className="text-white drop-shadow-lg" size={24} />
                            </div>
                        </div>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight tracking-tight text-white drop-shadow-xl">
                            DevARC Academy
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 animate-shimmer block mt-4 text-3xl md:text-4xl lg:text-5xl pb-2">
                                Aprenda IA aplicada à educação e produtividade
                            </span>
                        </h1>
                    </div>
                </div>
                <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Acessar Plataforma</h2>
                    <div className="flex bg-gray-100 dark:bg-[#1a1a1a] p-1 rounded-lg mb-6 border dark:border-gray-800">
                        <button type="button" onClick={() => setLoginMode('student')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${loginMode === 'student' ? 'bg-white dark:bg-white shadow text-[#0a0a0a] dark:text-[#0a0a0a]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Aluno</button>
                        <button type="button" onClick={() => setLoginMode('admin')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${loginMode === 'admin' ? 'bg-white dark:bg-white shadow text-[#0a0a0a] dark:text-[#0a0a0a]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Admin</button>
                    </div>

                    {loginMode === 'student' && inviteCode && (
                        <div className={`mb-4 rounded-lg border p-3 text-sm ${inviteInfo?.valid ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                            {inviteLoading ? (
                                <p>Validando convite...</p>
                            ) : inviteInfo?.valid ? (
                                <div>
                                    <p className="font-semibold">Convite ativo: {inviteInfo.invite.name}</p>
                                    <p>Turma: {inviteInfo.invite.turmaName || inviteInfo.invite.turmaId}</p>
                                    <p className="text-xs mt-1">Após entrar, o acesso será liberado automaticamente.</p>
                                </div>
                            ) : (
                                <div>
                                    <p className="font-semibold">Convite inválido</p>
                                    <p>{inviteInfo?.error || 'Não foi possível validar este link.'}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {loginMode === 'student' && inviteCode && inviteInfo?.valid && (
                        <div className="flex bg-gray-100 dark:bg-[#1a1a1a] p-1 rounded-lg mb-4 border dark:border-gray-800">
                            <button
                                type="button"
                                onClick={() => setStudentAction('signup')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${studentAction === 'signup' ? 'bg-white dark:bg-white shadow text-[#0a0a0a]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                            >
                                Criar Conta
                            </button>
                            <button
                                type="button"
                                onClick={() => setStudentAction('login')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${studentAction === 'login' ? 'bg-white dark:bg-white shadow text-[#0a0a0a]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                            >
                                Já Tenho Conta
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        {loginMode === 'student' && studentAction === 'signup' && (
                            <input
                                type="text"
                                required
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 outline-none focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Nome completo"
                            />
                        )}
                        <input type="email" required className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 outline-none focus:border-indigo-500 dark:bg-gray-700 dark:text-white" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
                        <input type="password" required className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 outline-none focus:border-indigo-500 dark:bg-gray-700 dark:text-white" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha" />
                        {loginMode === 'student' && studentAction === 'signup' && (
                            <input
                                type="password"
                                required
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 outline-none focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Confirmar senha"
                            />
                        )}
                        {loginError && <div className="text-red-500 text-sm flex items-center gap-2 font-medium bg-red-50 dark:bg-red-900/20 p-2 rounded-lg"><AlertCircle size={16} /> {loginError}</div>}
                        <Button
                            type="submit"
                            className="w-full py-3"
                            disabled={loading || inviteLoading || (loginMode === 'student' && studentAction === 'signup' && inviteCode && !inviteInfo?.valid)}
                        >
                            {loading
                                ? 'Processando...'
                                : (loginMode === 'student' && studentAction === 'signup')
                                    ? 'Criar Conta e Entrar'
                                    : (loginMode === 'student' && inviteCode && inviteInfo?.valid)
                                        ? 'Entrar e Liberar Acesso'
                                        : 'Entrar'}
                        </Button>
                    </form>
                    <div className="mt-6 flex justify-center">
                        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
