import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

const MAX_STACK_LENGTH = 2000;
const MAX_MESSAGE_LENGTH = 1000;

const trimText = (value, maxLength) => {
    const text = String(value || '');
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
};

export const logClientError = async (error, metadata = {}) => {
    const payload = {
        name: trimText(error?.name || 'Error', 120),
        message: trimText(error?.message || String(error), MAX_MESSAGE_LENGTH),
        stack: trimText(error?.stack || '', MAX_STACK_LENGTH),
        path: window.location.pathname,
        userAgent: trimText(window.navigator.userAgent, 500),
        metadata,
        createdAt: serverTimestamp()
    };

    console.error('ClientError:', payload);

    try {
        await addDoc(collection(db, 'app_errors'), payload);
    } catch (loggingError) {
        // Never fail UI due to telemetry errors.
        console.warn('Failed to persist app error log:', loggingError);
    }
};
