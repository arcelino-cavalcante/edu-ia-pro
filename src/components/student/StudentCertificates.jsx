import React, { useEffect, useMemo, useState } from 'react';
import { Award } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { loadJSPDF } from '../../services/pdfService';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';
import { useProgress } from '../../context/ProgressContext';
import { getStudentAccessibleStructure } from '../../utils/access';

export const StudentCertificates = ({ user, structure }) => {
    const { toast } = useToast();
    const { progressMap, loadingProgress } = useProgress();
    const [generatingCourseId, setGeneratingCourseId] = useState(null);

    useEffect(() => {
        loadJSPDF();
    }, []);

    const getCompletionFromMap = (lessonIds = [], map = {}) => {
        if (!lessonIds.length) return 0;
        const completedCount = lessonIds.filter((lessonId) => !!map[lessonId]?.completed).length;
        return (completedCount / lessonIds.length) * 100;
    };

    const myCourses = useMemo(() => {
        if (!user || !structure.length) return [];

        const accessibleStructure = getStudentAccessibleStructure(structure, user);
        const courses = [];

        accessibleStructure.forEach((turma) => {
            turma.children?.forEach((trilha) => {
                trilha.children?.forEach((curso) => {
                    const lessonIds = [];
                    curso.children?.forEach((modulo) => {
                        modulo.children?.forEach((lesson) => {
                            if (lesson?.id) lessonIds.push(lesson.id);
                        });
                    });

                    courses.push({
                        ...curso,
                        lessonIds,
                        progress: getCompletionFromMap(lessonIds, progressMap)
                    });
                });
            });
        });

        return courses;
    }, [user, structure, progressMap]);

    const generatePDF = async (course) => {
        if (!user?.id) return;

        setGeneratingCourseId(course.id);
        try {
            // Validação final no Firestore para evitar liberar com progresso inconsistente.
            const progressRef = doc(db, "users", user.id, "progress", "summary");
            const progressSnap = await getDoc(progressRef);
            const serverProgressMap = progressSnap.exists() ? progressSnap.data() : {};
            const validatedProgress = getCompletionFromMap(course.lessonIds, serverProgressMap);

            if (validatedProgress < 100) {
                toast.error("Curso ainda não concluído 100%. Continue estudando para liberar o certificado.");
                return;
            }

            if (!window.jspdf) {
                toast.info("Biblioteca de PDF carregando... Tente novamente em instantes.");
                return;
            }

            const validationCode = `${user.id.slice(0, 6)}-${course.id.slice(0, 6)}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
            const { jsPDF } = window.jspdf;
            const docPdf = new jsPDF({ orientation: 'landscape' });

            docPdf.setFillColor(79, 70, 229);
            docPdf.rect(0, 0, 297, 20, 'F');

            docPdf.setFontSize(40);
            docPdf.setTextColor(50, 50, 50);
            docPdf.text("CERTIFICADO", 148, 60, { align: 'center' });

            docPdf.setFontSize(16);
            docPdf.text("Certificamos que", 148, 80, { align: 'center' });

            docPdf.setFontSize(30);
            docPdf.setTextColor(79, 70, 229);
            docPdf.text(user.name, 148, 100, { align: 'center' });

            docPdf.setFontSize(16);
            docPdf.setTextColor(50, 50, 50);
            docPdf.text(`Concluiu com êxito o curso de ${course.name}`, 148, 120, { align: 'center' });

            docPdf.setFontSize(12);
            docPdf.text(`Data: ${new Date().toLocaleDateString()}`, 148, 140, { align: 'center' });
            docPdf.text(`Codigo de validacao: ${validationCode}`, 148, 148, { align: 'center' });

            docPdf.setDrawColor(200, 200, 200);
            docPdf.line(70, 160, 227, 160);
            docPdf.text("DevARC Academy Director", 148, 165, { align: 'center' });

            docPdf.save(`Certificado-${course.name}.pdf`);
        } catch (error) {
            console.error("Erro ao gerar certificado:", error);
            toast.error("Nao foi possivel gerar o certificado agora.");
        } finally {
            setGeneratingCourseId(null);
        }
    };

    if (loadingProgress) {
        return <div className="p-8 text-gray-500">Validando progresso dos cursos...</div>;
    }

    return (
        <div className="p-8 max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Meus Certificados</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Conclua 100% dos cursos para liberar o download.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myCourses.map((course) => (
                    <Card key={course.id} className="p-0 overflow-hidden flex flex-col md:flex-row group">
                        <div className={`w-full md:w-32 flex items-center justify-center p-6 text-white ${course.progress === 100 ? 'bg-indigo-600' : 'bg-gray-400'}`}>
                            <Award size={40} />
                        </div>
                        <div className="p-6 flex-1 flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{course.name}</h3>
                                <div className="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                                    <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${course.progress}%` }} />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{Math.round(course.progress)}% Concluido</p>
                            </div>
                            <div className="mt-4">
                                <Button
                                    disabled={course.progress < 100 || generatingCourseId === course.id}
                                    onClick={() => generatePDF(course)}
                                    variant={course.progress === 100 ? 'primary' : 'secondary'}
                                    className="w-full text-xs"
                                >
                                    {generatingCourseId === course.id
                                        ? 'Validando...'
                                        : (course.progress === 100 ? 'Baixar Certificado' : 'Bloqueado')}
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
                {myCourses.length === 0 && <p className="text-gray-500">Nenhum curso encontrado.</p>}
            </div>
        </div>
    );
};
