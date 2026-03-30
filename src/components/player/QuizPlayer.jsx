import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Award, RotateCcw, ArrowRight } from 'lucide-react';
import { Button } from '../common/Button';
import { useProgress } from '../../context/ProgressContext';
import { persistLessonProgress } from '../../services/progressService';

export const QuizPlayer = ({ quizLesson, userId, onComplete }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [hasPassed, setHasPassed] = useState(false);
    const [alreadyCompleted, setAlreadyCompleted] = useState(false);

    const { isLessonCompleted } = useProgress();

    // Configurações do quiz
    const questions = quizLesson.questions || [];
    const minScore = quizLesson.minScore || 70;

    useEffect(() => {
        if (isLessonCompleted(quizLesson.id)) {
            setAlreadyCompleted(true);
        }
    }, [quizLesson.id, isLessonCompleted]);

    const handleAnswerSelect = (optionIndex) => {
        if (isSubmitted || alreadyCompleted) return;
        setSelectedAnswers({
            ...selectedAnswers,
            [currentQuestionIndex]: optionIndex
        });
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            handleSubmit();
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitted(true);

        let correctCount = 0;
        questions.forEach((q, idx) => {
            if (selectedAnswers[idx] === q.correctIndex) {
                correctCount++;
            }
        });

        const finalScore = Math.round((correctCount / questions.length) * 100);
        setScore(finalScore);

        const passed = finalScore >= minScore;
        setHasPassed(passed);

        if (passed) {
            // Save progress to firebase
            try {
                await persistLessonProgress({
                    userId,
                    lessonId: quizLesson.id,
                    completed: true,
                    score: finalScore
                });
                onComplete();
                setAlreadyCompleted(true);
            } catch (error) {
                console.error("Erro ao salvar progresso do quiz:", error);
            }
        }
    };

    const handleRetry = () => {
        setIsSubmitted(false);
        setSelectedAnswers({});
        setCurrentQuestionIndex(0);
        setScore(0);
        setHasPassed(false);
    };

    if (!questions || questions.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white p-6">
                <div className="text-center max-w-md">
                    <h2 className="text-2xl font-bold mb-2">Quiz Indisponível</h2>
                    <p className="text-gray-400">Este questionário ainda não possui perguntas.</p>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    // View de Resultados
    if (isSubmitted || alreadyCompleted) {
        const displayScore = alreadyCompleted ? (score || 100) : score;
        const displayPassed = alreadyCompleted ? true : hasPassed;

        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white p-6 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${displayPassed ? 'from-green-500 to-emerald-400' : 'from-red-500 to-rose-400'}`}></div>

                <div className="bg-gray-800 p-8 rounded-2xl max-w-lg w-full text-center shadow-2xl border border-gray-700 relative z-10 animate-in zoom-in-95 duration-500">
                    <div className="mb-6 flex justify-center">
                        {displayPassed ? (
                            <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center">
                                <Award size={48} />
                            </div>
                        ) : (
                            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center">
                                <XCircle size={48} />
                            </div>
                        )}
                    </div>

                    <h2 className="text-3xl font-bold mb-2">
                        {displayPassed ? 'Parabéns!' : 'Não foi dessa vez...'}
                    </h2>
                    <p className="text-gray-400 mb-6">
                        {displayPassed
                            ? 'Você atingiu a nota necessária para passar.'
                            : `Você precisa de pelo menos ${minScore}% para passar.`}
                    </p>

                    <div className="flex justify-center gap-8 mb-8">
                        <div>
                            <span className="block text-4xl font-black text-white">{displayScore}%</span>
                            <span className="text-sm text-gray-500 uppercase tracking-widest font-medium">Sua Nota</span>
                        </div>
                        <div className="w-px bg-gray-700"></div>
                        <div>
                            <span className="block text-4xl font-black text-gray-400">{minScore}%</span>
                            <span className="text-sm text-gray-500 uppercase tracking-widest font-medium">Mínimo</span>
                        </div>
                    </div>

                    {!displayPassed && (
                        <Button onClick={handleRetry} className="w-full py-4 text-lg">
                            <RotateCcw size={20} className="mr-2" /> Tentar Novamente
                        </Button>
                    )}
                    {displayPassed && alreadyCompleted && (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl flex items-center justify-center gap-2">
                            <CheckCircle2 size={20} />
                            <span>Avaliação Concluída!</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // View da Pergunta
    return (
        <div className="w-full h-full flex flex-col bg-gray-900 text-white relative">
            {/* Header do Quiz */}
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 backdrop-blur-sm z-10">
                <div>
                    <h3 className="text-lg font-bold">{quizLesson.name}</h3>
                    <p className="text-sm text-gray-400">Avaliação Mínima: {minScore}%</p>
                </div>
                <div className="text-right">
                    <span className="text-sm font-medium text-indigo-400 uppercase tracking-widest">Pergunta</span>
                    <p className="text-xl font-bold">{currentQuestionIndex + 1} <span className="text-gray-500 text-sm">/ {questions.length}</span></p>
                </div>
            </div>

            {/* Barra de Progresso do Quiz */}
            <div className="h-1 bg-gray-800 w-full relative">
                <div
                    className="absolute top-0 left-0 h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                ></div>
            </div>

            {/* Container da Pergunta */}
            <div className="flex-1 overflow-y-auto p-6 md:p-12 flex flex-col items-center">
                <div className="max-w-3xl w-full">
                    <h2 className="text-2xl md:text-3xl font-semibold mb-8 leading-tight">
                        {currentQuestion.text}
                    </h2>

                    <div className="space-y-4">
                        {currentQuestion.options.map((opt, idx) => {
                            const isSelected = selectedAnswers[currentQuestionIndex] === idx;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswerSelect(idx)}
                                    className={`
                                        w-full text-left p-4 md:p-5 rounded-xl border-2 transition-all duration-200 group
                                        ${isSelected
                                            ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-800'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`
                                            w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                                            ${isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-500 group-hover:border-gray-400'}
                                        `}>
                                            {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                        </div>
                                        <span className={`text-lg ${isSelected ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                                            {opt}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Footer de Navegação */}
            <div className="p-6 border-t border-gray-800 bg-gray-900 flex justify-between items-center">
                <Button
                    variant="ghost"
                    onClick={handlePrev}
                    disabled={currentQuestionIndex === 0}
                    className="text-gray-400 hover:text-white"
                >
                    Voltar
                </Button>

                <Button
                    variant="primary"
                    onClick={handleNext}
                    disabled={selectedAnswers[currentQuestionIndex] === undefined}
                    className="px-8"
                >
                    {isLastQuestion ? 'Finalizar e Ver Resultado' : 'Próxima'} {isLastQuestion ? <CheckCircle2 size={18} className="ml-2" /> : <ArrowRight size={18} className="ml-2" />}
                </Button>
            </div>
        </div>
    );
};
