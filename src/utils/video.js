export const extractVideoID = (url) => {
    if (!url) return null;
    const normalized = String(url).trim();

    // Preserve Vimeo IDs already normalized in DB
    if (normalized.startsWith('vimeo-')) return normalized;

    // Se já for um ID (11 chars), retorna ele
    if (normalized.length === 11) return normalized;

    // Vimeo URL support
    const vimeoRegExp = /(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:[a-zA-Z0-9_-]+)?/i;
    const vimeoMatch = normalized.match(vimeoRegExp);
    if (vimeoMatch && vimeoMatch[1]) return `vimeo-${vimeoMatch[1]}`;

    // Tenta extrair de URLs comuns
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = normalized.match(regExp);

    return (match && match[2].length === 11) ? match[2] : null;
};
