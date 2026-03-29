import {
    addDoc,
    collection,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    doc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const NOTIFICATION_LIMIT = 50;

export const fetchUserNotifications = async (userId) => {
    if (!userId) return { global: [], personal: [] };

    const [globalSnap, personalSnap] = await Promise.all([
        getDocs(query(collection(db, 'global_notifications'), orderBy('createdAt', 'desc'), limit(NOTIFICATION_LIMIT))),
        getDocs(query(collection(db, 'users', userId, 'notifications'), orderBy('createdAt', 'desc'), limit(NOTIFICATION_LIMIT)))
    ]);

    return {
        global: globalSnap.docs.map((item) => ({ id: item.id, ...item.data(), isGlobal: true })),
        personal: personalSnap.docs.map((item) => ({ id: item.id, ...item.data(), isGlobal: false }))
    };
};

export const markPersonalNotificationRead = async (userId, notificationId) => {
    await updateDoc(doc(db, 'users', userId, 'notifications', notificationId), { read: true });
};

export const createPersonalNotification = async (targetUserId, title, message, type = 'info') => {
    await addDoc(collection(db, 'users', targetUserId, 'notifications'), {
        title,
        message,
        type,
        read: false,
        createdAt: serverTimestamp()
    });
};

export const createGlobalNotification = async (title, message, type = 'system') => {
    await addDoc(collection(db, 'global_notifications'), {
        title,
        message,
        type,
        createdAt: serverTimestamp()
    });
};
