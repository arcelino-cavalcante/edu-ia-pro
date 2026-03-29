import React, { useState, useEffect, Suspense, lazy } from 'react';
import { getStudentAccessibleStructure } from './utils/access';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProgressProvider } from './context/ProgressContext';
import { NotificationProvider } from './context/NotificationContext';
import { useToast, ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { loadStructureTree } from './services/structureService';
import { logClientError } from './services/errorService';

// Components
// Lazy Loaded Components
const LoginPage = lazy(() => import('./components/auth/LoginPage').then(module => ({ default: module.LoginPage })));
const AppLayout = lazy(() => import('./components/layout/AppLayout').then(module => ({ default: module.AppLayout })));
const Sidebar = lazy(() => import('./components/layout/Sidebar').then(module => ({ default: module.Sidebar })));
const Header = lazy(() => import('./components/layout/Header').then(module => ({ default: module.Header })));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const AdminStudents = lazy(() => import('./components/admin/AdminStudents').then(module => ({ default: module.AdminStudents })));
const StructureManager = lazy(() => import('./components/admin/StructureManager').then(module => ({ default: module.StructureManager })));
const AdminInviteLinks = lazy(() => import('./components/admin/AdminInviteLinks').then(module => ({ default: module.AdminInviteLinks })));
const AdminLiveClasses = lazy(() => import('./components/admin/AdminLiveClasses').then(module => ({ default: module.AdminLiveClasses })));
const StudentLiveClasses = lazy(() => import('./components/student/StudentLiveClasses').then(module => ({ default: module.StudentLiveClasses })));
const AdminComments = lazy(() => import('./components/admin/AdminComments').then(module => ({ default: module.AdminComments })));
const AdminProducts = lazy(() => import('./components/admin/AdminProducts').then(module => ({ default: module.AdminProducts })));
const StudentProducts = lazy(() => import('./components/student/StudentProducts').then(module => ({ default: module.StudentProducts })));
const StudentCertificates = lazy(() => import('./components/student/StudentCertificates').then(module => ({ default: module.StudentCertificates })));
const Community = lazy(() => import('./components/common/Community').then(module => ({ default: module.Community })));
const StudentDashboard = lazy(() => import('./components/student/StudentDashboard').then(module => ({ default: module.StudentDashboard })));
const CoursePlayer = lazy(() => import('./components/player/CoursePlayer').then(module => ({ default: module.CoursePlayer })));

// Loading Component
const Loading = () => <div className="h-screen flex items-center justify-center dark:bg-gray-950 dark:text-white">Carregando DevARC Academy...</div>;

const Main = () => {
    const { currentUser, loading, logout } = useAuth();
    const { toast } = useToast();

    // Global Data State
    const [structure, setStructure] = useState([]);
    // usersList removed (Dead Code Cleanup)

    // Navigation State
    const [adminTab, setAdminTab] = useState('dashboard');
    const [studentTab, setStudentTab] = useState('courses');
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [view, setView] = useState('login'); // login, admin, student, player
    const [previewMode, setPreviewMode] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Sync View with Auth
    useEffect(() => {
        if (!loading) {
            if (currentUser) {
                if (currentUser.status === 'inactive') {
                    toast.error("Sua conta está inativa. Entre em contato com o administrador.");
                    if (logout) logout();
                    setView('login');
                    return;
                }

                if (currentUser.role === 'admin' && !previewMode) {
                    setView('admin');
                } else {
                    setView('student');
                }
            } else {
                setView('login');
            }
        }
    }, [currentUser, loading, previewMode]);

    // Data Fetching
    useEffect(() => {
        if (!currentUser) return;

        const fetchStructure = async () => {
            try {
                const data = await loadStructureTree();
                setStructure(data);
            } catch (error) {
                await logClientError(error, { source: 'App.fetchStructure' });
                toast.error('Não foi possível carregar a estrutura da plataforma.');
            }
        };

        fetchStructure();
    }, [currentUser, toast]);

    const getStudentStructure = () => {
        return getStudentAccessibleStructure(structure, currentUser);
    };

    if (loading) return <Loading />;

    if (view === 'login') return (
        <Suspense fallback={<Loading />}>
            <LoginPage />
        </Suspense>
    );

    if (view === 'player' && selectedCourse) {
        return (
            <Suspense fallback={<Loading />}>
                <CoursePlayer course={selectedCourse} user={currentUser} onBack={() => { setView('student'); setSelectedCourse(null); }} />
            </Suspense>
        );
    }

    return (
        <Suspense fallback={<Loading />}>
            <AppLayout>
                <Sidebar
                    view={view}
                    adminTab={adminTab}
                    setAdminTab={setAdminTab}
                    studentTab={studentTab}
                    setStudentTab={setStudentTab}
                    previewMode={previewMode}
                    setPreviewMode={setPreviewMode}
                    isMobileMenuOpen={isMobileMenuOpen}
                    setIsMobileMenuOpen={setIsMobileMenuOpen}
                />
                <main className="flex-1 overflow-y-auto w-full bg-gray-50 dark:bg-gray-950 transition-colors relative">
                    <Header isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
                    {view === 'admin' ? (
                        <>
                            {adminTab === 'dashboard' && <AdminDashboard structure={structure} />}
                            {adminTab === 'students' && <AdminStudents structure={structure} />}
                            {adminTab === 'content' && <StructureManager structure={structure} setStructure={setStructure} />}
                            {adminTab === 'invites' && <AdminInviteLinks structure={structure} />}
                            {adminTab === 'live' && <AdminLiveClasses />}
                            {adminTab === 'products' && <AdminProducts />}
                            {adminTab === 'comments' && <AdminComments />}
                            {adminTab === 'community' && <Community />}
                        </>
                    ) : (
                        <>
                            {studentTab === 'courses' && (
                                <StudentDashboard
                                    structure={getStudentStructure()}
                                    user={currentUser}
                                    onSelectCourse={(c) => { setSelectedCourse(c); setView('player'); }}
                                    activeTab={studentTab}
                                    setActiveTab={setStudentTab}
                                />
                            )}
                            {studentTab === 'live' && <StudentLiveClasses />}
                            {studentTab === 'products' && <StudentProducts />}
                            {studentTab === 'certificates' && <StudentCertificates user={currentUser} structure={structure} />}
                            {studentTab === 'community' && <Community />}
                        </>
                    )}
                </main>
            </AppLayout>
        </Suspense>
    );
};

// ... (No extra imports here)

export default function App() {
    return (
        <ErrorBoundary name="GlobalAppBoundary">
            <ThemeProvider>
                <AuthProvider>
                    <ProgressProvider>
                        <NotificationProvider>
                            <ToastProvider>
                                <Main />
                            </ToastProvider>
                        </NotificationProvider>
                    </ProgressProvider>
                </AuthProvider>
            </ThemeProvider>
        </ErrorBoundary>
    );
}
