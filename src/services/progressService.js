import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const PROGRESS_EVENT_NAME = 'edu-progress-updated';
const CHECKPOINT_SECONDS = 5 * 60;

export const shouldPersistCheckpoint = (currentTime = 0, lastSavedTime = 0) => {
    if (!Number.isFinite(currentTime) || currentTime <= 0) return false;
    if (!Number.isFinite(lastSavedTime) || lastSavedTime < 0) return true;
    return currentTime - lastSavedTime >= CHECKPOINT_SECONDS;
};

export const getProgressSummary = async (userId) => {
    if (!userId) return {};
    const ref = doc(db, 'users', userId, 'progress', 'summary');
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : {};
};

export const emitProgressEvent = (lessonId, payload) => {
    if (!lessonId) return;
    window.dispatchEvent(new CustomEvent(PROGRESS_EVENT_NAME, {
        detail: {
            lessonId,
            ...payload
        }
    }));
};

export const subscribeToProgressEvents = (onUpdate) => {
    if (typeof onUpdate !== 'function') return () => { };

    const handler = (event) => {
        onUpdate(event.detail || {});
    };

    window.addEventListener(PROGRESS_EVENT_NAME, handler);
    return () => window.removeEventListener(PROGRESS_EVENT_NAME, handler);
};

export const persistLessonProgress = async ({
    userId,
    lessonId,
    lastPosition = 0,
    completed = false,
    score = undefined
}) => {
    if (!userId || !lessonId) return;

    const payload = {
        [lessonId]: {
            lastPosition: Number(lastPosition) || 0,
            completed: !!completed,
            ...(Number.isFinite(Number(score)) ? { score: Number(score) } : {}),
            updatedAt: new Date().toISOString()
        },
        lastActiveAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', userId, 'progress', 'summary'), payload, { merge: true });
    emitProgressEvent(lessonId, payload[lessonId]);
};
