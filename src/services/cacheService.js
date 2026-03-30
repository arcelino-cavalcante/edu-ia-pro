const DEFAULT_TTL_MS = 5 * 60 * 1000;

export const getCachedValue = (key, ttlMs = DEFAULT_TTL_MS) => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        if (typeof parsed.timestamp !== 'number') return null;
        if (Date.now() - parsed.timestamp > ttlMs) return null;
        return parsed.data ?? null;
    } catch (error) {
        console.warn(`Invalid cache for key ${key}`, error);
        return null;
    }
};

export const setCachedValue = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify({
            timestamp: Date.now(),
            data
        }));
    } catch (error) {
        console.warn(`Unable to persist cache for key ${key}`, error);
    }
};

export const clearCachedValue = (key) => {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.warn(`Unable to clear cache for key ${key}`, error);
    }
};
