import React, { useState, useMemo } from 'react';
import { ArrowLeft, BookOpen, CheckCircle, Circle, FileText, Download, Play, ChevronDown, ChevronRight, Menu, X, CheckCircle2, FileQuestion, Lock } from 'lucide-react';
import { WhiteLabelPlayer } from './WhiteLabelPlayer';
import { QuizPlayer } from './QuizPlayer';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { useProgress } from '../../context/ProgressContext';
import { CommentSection } from './CommentSection';

export const CoursePlayer = ({ course, user, onBack }) => {
    const [currentModuleId, setCurrentModuleId] = useState(course.children?.[0]?.id);
    const [currentLessonId, setCurrentLessonId] = useState(course.children?.[0]?.children?.[0]?.id);
    const [activeTab, setActiveTab] = useState('description');
    const [expandedModules, setExpandedModules] = useState({ [course.children?.[0]?.id]: true });
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Progress Context
    const { calculateCompletion, isLessonCompleted } = useProgress();

    // Encontrar aula atual
    const currentModule = course.children?.find(m => m.id === currentModuleId);
    const currentLesson = currentModule?.children?.find(l => l.id === currentLessonId);

    // Flatten lessons for easier navigation
    const allLessons = useMemo(() => {
        return course.children?.flatMap(m => m.children || []) || [];
    }, [course]);

    // Calculate Course Progress
    const courseProgress = calculateCompletion(allLessons.map(l => l.id));

    const getModuleLockStatus = (module) => {
        if (module.dripDays > 0 && user?.createdAt) {
            const createdDate = user.createdAt?.seconds ? new Date(user.createdAt.seconds * 1000) : new Date(user.createdAt);
            const diffTime = new Date() - createdDate;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays < module.dripDays) {
                const daysLeft = module.dripDays - diffDays;
                return { locked: true, reason: 'drip', message: `Libera em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}` };
            }
        }
        if (module.prerequisiteModuleId) {
            const prereqMod = course.children?.find(m => m.id === module.prerequisiteModuleId);
            if (prereqMod) {
                const prereqLessons = prereqMod.children?.map(l => l.id) || [];
                if (prereqLessons.length > 0) {
                    const completedCount = prereqLessons.filter(id => isLessonCompleted(id)).length;
                    if (completedCount < prereqLessons.length) {
                        return { locked: true, reason: 'prereq', message: `Requer: ${prereqMod.name}` };
                    }
                }
            }
        }
        return { locked: false };
    };

    // Navegação simples
    const handleLessonSelect = (modId, lessonId) => {
        const mod = course.children?.find(m => m.id === modId);
        if (mod && getModuleLockStatus(mod).locked) return;

        setCurrentModuleId(modId);
        setCurrentLessonId(lessonId);
        setIsSidebarOpen(false);
    };

    const toggleModule = (modId) => {
        setExpandedModules(prev => ({ ...prev, [modId]: !prev[modId] }));
    };

    const handleLessonComplete = () => {
        // Auto-advance logic
        const currentIndex = allLessons.findIndex(l => l.id === currentLessonId);
        if (currentIndex !== -1 && currentIndex < allLessons.length - 1) {
            const nextLesson = allLessons[currentIndex + 1];
            // Find parent module of next lesson
            const parentModule = course.children.find(m => m.children.some(l => l.id === nextLesson.id));
            if (parentModule && !getModuleLockStatus(parentModule).locked) {
                setTimeout(() => {
                    setExpandedModules(prev => ({ ...prev, [parentModule.id]: true }));
                    setCurrentModuleId(parentModule.id);
                    setCurrentLessonId(nextLesson.id);
                }, 1500); // 1.5s delay for effect
            }
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* Header Minimalista */}
            <div className="h-16 bg-white dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-white/5 flex items-center px-4 lg:px-8 justify-between shrink-0 z-50 transition-colors duration-300">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-white transition-colors"
                        title="Voltar para Dashboard"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="h-6 w-px bg-gray-200 dark:bg-white/10 hidden sm:block"></div>
                    <div>
                        <h1 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest hidden sm:block">Curso</h1>
                        <h2 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white truncate max-w-[200px] lg:max-w-md">{course.name}</h2>
                    </div>
                </div>

                <button
                    className="lg:hidden p-2 text-gray-700 dark:text-white"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                    {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {/* Cinema Mode Player Container (Always Dark) */}
                    <div className="w-full bg-black shadow-2xl relative z-10 flex justify-center text-white">
                        <div className="w-full max-w-7xl aspect-video relative">
                            {currentLesson ? (
                                currentLesson.type === 'quiz' ? (
                                    <QuizPlayer
                                        quizLesson={currentLesson}
                                        userId={user?.id}
                                        onComplete={handleLessonComplete}
                                    />
                                ) : (
                                    <WhiteLabelPlayer
                                        videoId={currentLesson.videoId || ''}
                                        lessonId={currentLesson.id}
                                        userId={user?.id}
                                        onComplete={handleLessonComplete}
                                    />
                                )
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                                    <p>Selecione uma aula para começar</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content Below Player */}
                    <div className="flex-1 w-full max-w-7xl mx-auto p-6 lg:p-10 transition-colors duration-300">
                        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
                            {/* Left Column: Info & Tabs */}
                            <div className="flex-1 min-w-0">
                                {/* Navigation Buttons */}
                                <div className="flex items-center gap-3 mb-6">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={!allLessons.find((l, i) => allLessons[i + 1]?.id === currentLessonId)}
                                        onClick={() => {
                                            const idx = allLessons.findIndex(l => l.id === currentLessonId);
                                            if (idx > 0) {
                                                const prev = allLessons[idx - 1];
                                                const parent = course.children.find(m => m.children.some(l => l.id === prev.id));
                                                handleLessonSelect(parent.id, prev.id);
                                            }
                                        }}
                                    >
                                        <ChevronDown className="rotate-90 mr-1" size={16} /> Anterior
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        disabled={!allLessons.find((l, i) => allLessons[i - 1]?.id === currentLessonId)} // Logic verify below
                                        onClick={() => {
                                            const idx = allLessons.findIndex(l => l.id === currentLessonId);
                                            if (idx !== -1 && idx < allLessons.length - 1) {
                                                const next = allLessons[idx + 1];
                                                const parent = course.children.find(m => m.children.some(l => l.id === next.id));
                                                handleLessonSelect(parent.id, next.id);
                                            }
                                        }}
                                    >
                                        Próxima <ChevronRight size={16} className="ml-1" />
                                    </Button>
                                    <div className="flex-1" />
                                </div>

                                <div className="mb-8">
                                    <div className="flex flex-wrap items-center gap-3 mb-3 text-sm">
                                        <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium border border-indigo-500/20">
                                            {currentModule?.name}
                                        </span>
                                        {currentLesson?.duration && (
                                            <span className="text-gray-500 dark:text-gray-400">• {currentLesson.duration}</span>
                                        )}
                                    </div>
                                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">{currentLesson?.name}</h1>
                                </div>

                                {/* Tabs Navigation */}
                                <div className="flex border-b border-gray-200 dark:border-white/10 mb-6 overflow-x-auto">
                                    <button
                                        onClick={() => setActiveTab('description')}
                                        className={`px-6 py-3 text-sm font-medium transition-all relative whitespace-nowrap ${activeTab === 'description'
                                            ? 'text-indigo-600 dark:text-white'
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        Descrição
                                        {activeTab === 'description' && (
                                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></span>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('materials')}
                                        className={`px-6 py-3 text-sm font-medium transition-all relative whitespace-nowrap ${activeTab === 'materials'
                                            ? 'text-indigo-600 dark:text-white'
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        Materiais
                                        {activeTab === 'materials' && (
                                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></span>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('comments')}
                                        className={`px-6 py-3 text-sm font-medium transition-all relative whitespace-nowrap ${activeTab === 'comments'
                                            ? 'text-indigo-600 dark:text-white'
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        Dúvidas
                                        {activeTab === 'comments' && (
                                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></span>
                                        )}
                                    </button>
                                </div>

                                {/* Tab Panels */}
                                <div className="min-h-[200px]">
                                    {activeTab === 'description' && (
                                        <div className="text-gray-600 dark:text-gray-400 leading-relaxed text-base space-y-4 animate-in fade-in duration-300">
                                            <p>{currentLesson?.description || "Esta aula não possui descrição detalhada."}</p>
                                        </div>
                                    )}

                                    {activeTab === 'materials' && (
                                        <div className="space-y-3 animate-in fade-in duration-300">
                                            {currentLesson?.materials?.length > 0 ? (
                                                currentLesson.materials.map((mat, idx) => (
                                                    <div key={idx} className="group flex items-center justify-between p-4 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 hover:border-indigo-500/30 hover:shadow-lg dark:hover:bg-white/10 transition-all">
                                                        <div className="flex items-center gap-4">
                                                            <div className="p-2.5 bg-indigo-50 text-indigo-600 dark:bg-white/10 dark:text-indigo-400 rounded-lg group-hover:scale-110 transition-transform">
                                                                <FileText size={20} />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-200 group-hover:text-[#0a0a0a] dark:group-hover:text-white dark:group-hover:text-white transition-colors">{mat.name}</h4>
                                                                <span className="text-xs text-gray-500 uppercase tracking-wider">PDF</span>
                                                            </div>
                                                        </div>
                                                        <Button size="sm" variant="ghost" className="text-gray-400 hover:text-indigo-600 dark:hover:text-white">
                                                            <Download size={18} />
                                                        </Button>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-10 border border-dashed border-gray-300 dark:border-white/10 rounded-xl text-gray-500">
                                                    Nenhum material complementar disponível.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'comments' && (
                                        <CommentSection lessonId={currentLesson.id} lessonName={currentLesson.name} />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Playlist (Desktop & Mobile Overlay) */}
                <div className={`
                    fixed lg:static inset-y-0 right-0 w-80 lg:w-96 bg-white dark:bg-[#161616] border-l border-gray-200 dark:border-white/5 
                    transform transition-transform duration-300 z-40 flex flex-col
                    ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
                `}>
                    <div className="p-6 border-b border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-[#161616]">
                        <h3 className="text-gray-900 dark:text-gray-100 font-semibold flex items-center gap-2">
                            <BookOpen size={18} className="text-indigo-600 dark:text-indigo-500" />
                            Conteúdo do Curso
                        </h3>
                        {/* Real Progress Bar */}
                        <div className="mt-4">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Progresso</span>
                                <span>{courseProgress}%</span>
                            </div>
                            <div className="h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${courseProgress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10 scrollbar-track-transparent bg-white dark:bg-transparent">
                        <div className="p-4 space-y-4">
                            {course.children?.map((module, modIdx) => {
                                const lockStatus = getModuleLockStatus(module);
                                return (
                                    <div key={module.id} className={`bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-xl overflow-hidden shadow-sm dark:shadow-none ${lockStatus.locked ? 'opacity-80' : ''}`}>
                                        <button
                                            onClick={() => toggleModule(module.id)}
                                            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors text-left"
                                        >
                                            <div className="flex-1 pr-2">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">Módulo {modIdx + 1}</span>
                                                    {lockStatus.locked && <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded uppercase tracking-wider"><Lock size={10} /> {lockStatus.message}</span>}
                                                </div>
                                                <h4 className={`text-sm font-medium ${lockStatus.locked ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-200'}`}>{module.name}</h4>
                                            </div>
                                            {expandedModules[module.id] ? <ChevronDown size={16} className={`text-gray-500 shrink-0 ${lockStatus.locked ? 'opacity-50' : ''}`} /> : <ChevronRight size={16} className={`text-gray-500 shrink-0 ${lockStatus.locked ? 'opacity-50' : ''}`} />}
                                        </button>

                                        {expandedModules[module.id] && (
                                            <div className="divide-y divide-gray-100 dark:divide-white/5">
                                                {module.children?.map(lesson => {
                                                    const isActive = lesson.id === currentLessonId;
                                                    const isCompleted = isLessonCompleted(lesson.id);

                                                    return (
                                                        <button
                                                            key={lesson.id}
                                                            disabled={lockStatus.locked}
                                                            onClick={() => handleLessonSelect(module.id, lesson.id)}
                                                            className={`
                                                            w-full flex items-start gap-3 p-4 text-left transition-all
                                                            ${lockStatus.locked
                                                                    ? 'opacity-50 cursor-not-allowed hover:bg-transparent'
                                                                    : (isActive
                                                                        ? 'bg-indigo-50 dark:bg-white/5 border-l-2 border-indigo-600 dark:border-indigo-500'
                                                                        : 'hover:bg-gray-50 dark:hover:bg-white/[0.02] border-l-2 border-transparent hover:border-gray-200 dark:hover:border-white/10')
                                                                }
                                                        `}
                                                        >
                                                            <div className={`mt-0.5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-600'}`}>
                                                                {/* Status Icon */}
                                                                {isCompleted ? (
                                                                    <CheckCircle2 size={14} className="text-green-500" />
                                                                ) : (
                                                                    lesson.type === 'quiz' ? (
                                                                        <FileQuestion size={14} />
                                                                    ) : (
                                                                        isActive ? <Play size={14} fill="currentColor" /> : <Circle size={14} />
                                                                    )
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-sm font-medium leading-normal ${isActive ? 'text-indigo-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-300'}`}>
                                                                    {lesson.name}
                                                                </p>
                                                                <span className="text-xs text-gray-500 mt-1 block">{lesson.duration || '00:00'}</span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Mobile Overlay Backdrop */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}
            </div>
        </div>
    );
};
