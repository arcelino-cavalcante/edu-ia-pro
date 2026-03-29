import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getProgressSummary, subscribeToProgressEvents } from '../services/progressService';

const ProgressContext = createContext();

export const ProgressProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [progressMap, setProgressMap] = useState({}); // { lessonId: { completed: true, lastPosition: 120 } }
    const [loadingProgress, setLoadingProgress] = useState(true);

    useEffect(() => {
        if (!currentUser || currentUser.role !== 'student') {
            setProgressMap({});
            setLoadingProgress(false);
            return;
        }

        let mounted = true;

        const loadProgress = async () => {
            try {
                const summary = await getProgressSummary(currentUser.id);
                if (mounted) setProgressMap(summary || {});
            } catch (error) {
                console.error("Error loading progress:", error);
            } finally {
                if (mounted) setLoadingProgress(false);
            }
        };

        loadProgress();
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') loadProgress();
        };
        window.addEventListener('visibilitychange', handleVisibility);

        const unsubscribeEvents = subscribeToProgressEvents(({ lessonId, ...lessonPayload }) => {
            if (!lessonId) return;
            setProgressMap((prev) => ({
                ...prev,
                [lessonId]: {
                    ...(prev[lessonId] || {}),
                    ...lessonPayload
                }
            }));
        });

        return () => {
            mounted = false;
            unsubscribeEvents();
            window.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [currentUser]);

    // Calcula porcentagem de conclusão de um módulo ou curso inteiro
    // Espera receber uma lista de lessonIds
    const calculateCompletion = (lessonIds = []) => {
        if (!lessonIds.length) return 0;
        const completedCount = lessonIds.filter(id => progressMap[id]?.completed).length;
        return Math.round((completedCount / lessonIds.length) * 100);
    };

    const isLessonCompleted = (lessonId) => {
        return !!progressMap[lessonId]?.completed;
    };

    return (
        <ProgressContext.Provider value={{ progressMap, loadingProgress, calculateCompletion, isLessonCompleted }}>
            {children}
        </ProgressContext.Provider>
    );
};

export const useProgress = () => useContext(ProgressContext);
