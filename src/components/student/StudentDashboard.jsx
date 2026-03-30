import React from 'react';
import { Play } from 'lucide-react';
import { Badge } from '../common/Badge';
import { StudentCertificates } from './StudentCertificates';

export const StudentDashboard = ({ structure, user, onSelectCourse, activeTab, setActiveTab }) => {
    const myTracks = structure[0]?.children || [];

    return (
        <div>
            {activeTab === 'courses' && (
                <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
                    <div className="mb-10"><h1 className="text-3xl font-bold text-gray-900 dark:text-white">Meus Cursos</h1><p className="text-gray-500 dark:text-gray-400 mt-2">Conteúdo exclusivo da sua turma.</p></div>
                    <style>{`
                        .hide-scrollbar::-webkit-scrollbar { display: none; }
                        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                    `}</style>
                    <div className="space-y-12">
                        {myTracks.length === 0 ? <p className="text-gray-500 dark:text-gray-400">Nenhum conteúdo disponível para sua turma.</p> :
                            myTracks.map(track => (
                                <div key={track.id} className="relative">
                                    <div className="mb-4 flex items-baseline justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{track.name}</h2>
                                            {track.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">{track.description}</p>}
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 pt-2 px-1 -mx-1 snap-x hide-scrollbar cursor-grab active:cursor-grabbing">
                                        {(!track.children || track.children.length === 0) ? (
                                            <div className="w-full py-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-gray-500 dark:text-gray-400 text-sm">
                                                Nenhum curso cadastrado nesta trilha ainda.
                                            </div>
                                        ) : track.children.map(course => (
                                            <div 
                                                key={course.id} 
                                                onClick={() => onSelectCourse(course)}
                                                className="snap-start shrink-0 w-[260px] md:w-[320px] group cursor-pointer flex flex-col gap-3"
                                            >
                                                <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 group-hover:border-indigo-500/50 transition-all duration-300 group-hover:shadow-2xl dark:group-hover:shadow-indigo-500/20">
                                                    {course.coverImage ? (
                                                        <img src={course.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" alt={course.name} />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/5 to-purple-500/5 dark:from-indigo-500/10 dark:to-purple-500/10">
                                                            <span className="text-5xl font-bold text-indigo-500/20 dark:text-indigo-400/20">{course.name.charAt(0)}</span>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Hover Play Overlay */}
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                                        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300 shadow-xl">
                                                            <Play className="text-white fill-white ml-1" size={24} />
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div>
                                                    <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-2 leading-snug transition-colors text-lg">
                                                        {course.name}
                                                    </h3>
                                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-500 mt-1 uppercase tracking-wider flex items-center gap-2">
                                                        {course.coverImage ? 'Curso em Vídeo' : 'Curso Interativo'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}
            {activeTab === 'certificates' && <StudentCertificates user={user} structure={structure} />}
            {activeTab === 'community' && <div className="p-8 text-center text-gray-500">Comunidade virá aqui.</div>}
        </div>
    );
};
