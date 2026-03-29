import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCachedValue, setCachedValue, clearCachedValue } from './cacheService';

const PRODUCTS_CACHE_KEY = 'edu_pro_products_cache_v1';
const PRODUCTS_CACHE_TTL_MS = 5 * 60 * 1000;

export const invalidateProductsCache = () => clearCachedValue(PRODUCTS_CACHE_KEY);

export const listProducts = async ({ forceRefresh = false } = {}) => {
    if (!forceRefresh) {
        const cached = getCachedValue(PRODUCTS_CACHE_KEY, PRODUCTS_CACHE_TTL_MS);
        if (cached) return cached;
    }

    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const products = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
    setCachedValue(PRODUCTS_CACHE_KEY, products);
    return products;
};

export const saveProduct = async ({ id = null, data }) => {
    const payload = {
        ...data,
        updatedAt: serverTimestamp()
    };

    if (id) {
        await updateDoc(doc(db, 'products', id), payload);
        invalidateProductsCache();
        return;
    }

    await addDoc(collection(db, 'products'), {
        ...payload,
        createdAt: serverTimestamp()
    });
    invalidateProductsCache();
};

export const deleteProduct = async (id) => {
    await deleteDoc(doc(db, 'products', id));
    invalidateProductsCache();
};
