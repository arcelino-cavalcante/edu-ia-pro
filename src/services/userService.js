import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getCountFromServer,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    startAfter,
    updateDoc,
    where
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export const USERS_PAGE_SIZE = 50;

const baseUsersQuery = ({ roleFilter = 'all' } = {}) => {
    const constraints = [];
    if (roleFilter && roleFilter !== 'all') {
        constraints.push(where('role', '==', roleFilter));
    }
    return query(collection(db, 'users'), ...constraints);
};

export const listUsersPage = async ({ roleFilter = 'all', lastVisible = null } = {}) => {
    const constraints = [orderBy('email', 'asc')];
    if (roleFilter && roleFilter !== 'all') constraints.unshift(where('role', '==', roleFilter));
    if (lastVisible) constraints.push(startAfter(lastVisible));
    constraints.push(limit(USERS_PAGE_SIZE));

    const q = query(collection(db, 'users'), ...constraints);
    const snap = await getDocs(q);
    const users = snap.docs.map((item) => ({ id: item.id, ...item.data() }));

    return {
        users,
        lastVisible: snap.empty ? null : snap.docs[snap.docs.length - 1],
        hasMore: snap.docs.length === USERS_PAGE_SIZE
    };
};

export const getUsersCount = async ({ roleFilter = 'all' } = {}) => {
    const q = baseUsersQuery({ roleFilter });
    const snap = await getCountFromServer(q);
    return snap.data().count || 0;
};

export const createStudentUser = async (userData) => {
    const payload = {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
    const ref = await addDoc(collection(db, 'users'), payload);
    return { id: ref.id, ...payload };
};

export const updateStudentUser = async (userId, userData) => {
    const payload = {
        ...userData,
        updatedAt: serverTimestamp()
    };
    await updateDoc(doc(db, 'users', userId), payload);
    return payload;
};

export const removeStudentUser = async (userId) => {
    await deleteDoc(doc(db, 'users', userId));
};
