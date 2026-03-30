import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
    createGlobalNotification,
    createPersonalNotification,
    fetchUserNotifications,
    markPersonalNotificationRead
} from '../services/notificationService';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [readGlobalIds, setReadGlobalIds] = useState(() => {
        const saved = localStorage.getItem('readGlobalIds');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('readGlobalIds', JSON.stringify(readGlobalIds));
    }, [readGlobalIds]);

    const markAsRead = async (notificationId, isGlobal) => {
        if (!currentUser) return;

        if (isGlobal) {
            if (!readGlobalIds.includes(notificationId)) {
                setReadGlobalIds((prev) => [...prev, notificationId]);
                setNotifications((prev) => prev.map((n) => n.id === notificationId ? { ...n, read: true } : n));
                setUnreadCount((prev) => Math.max(0, prev - 1));
            }
            return;
        }

        try {
            await markPersonalNotificationRead(currentUser.id, notificationId);
            setNotifications((prev) => prev.map((n) => n.id === notificationId ? { ...n, read: true } : n));
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    };

    useEffect(() => {
        if (!currentUser || !currentUser.id) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        let mounted = true;
        let intervalId = null;

        const applyNotifications = ({ global = [], personal = [] }) => {
            const filteredGlobals = global.filter((n) => {
                if (n.type === 'admin_alert') return currentUser.role === 'admin';
                return true;
            });

            const merged = [...personal, ...filteredGlobals]
                .map((n) => n.isGlobal ? { ...n, read: readGlobalIds.includes(n.id) } : n)
                .sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                    return dateB - dateA;
                });

            if (!mounted) return;
            setNotifications(merged);
            setUnreadCount(merged.filter((n) => !n.read).length);
        };

        const syncNotifications = async () => {
            try {
                const data = await fetchUserNotifications(currentUser.id);
                applyNotifications(data);
            } catch (error) {
                console.error("Error loading notifications:", error);
            }
        };

        syncNotifications();
        intervalId = window.setInterval(syncNotifications, 5 * 60 * 1000);

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                syncNotifications();
            }
        };

        window.addEventListener('visibilitychange', handleVisibility);

        return () => {
            mounted = false;
            if (intervalId) window.clearInterval(intervalId);
            window.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [currentUser, readGlobalIds]);

    const sendPersonalNotification = async (targetUserId, title, message, type = 'info') => {
        try {
            await createPersonalNotification(targetUserId, title, message, type);
        } catch (error) {
            console.error("Error sending notification:", error);
        }
    };

    const sendGlobalNotification = async (title, message, type = 'system') => {
        try {
            await createGlobalNotification(title, message, type);
        } catch (error) {
            console.error("Error sending global notification:", error);
        }
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, sendPersonalNotification, sendGlobalNotification }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => useContext(NotificationContext);
