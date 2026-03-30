export const INVITE_LINKS_PRIMARY_PATH = ['invite_links'];
export const INVITE_LINKS_FALLBACK_PATH = ['users', 'system_config', 'invite_links'];

export const isPermissionDeniedError = (error) => {
    const message = String(error?.message || '').toLowerCase();
    return error?.code === 'permission-denied' || message.includes('insufficient permissions');
};

export const pathToKey = (path = []) => path.join('/');
export const keyToPath = (pathKey = '') => pathKey.split('/').filter(Boolean);
