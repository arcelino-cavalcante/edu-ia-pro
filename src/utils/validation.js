export const isValidEmail = (email = '') => /\S+@\S+\.\S+/.test(String(email).trim());

export const validateStudentForm = (formData = {}) => {
    if (!String(formData.name || '').trim()) return 'Nome é obrigatório.';
    if (!isValidEmail(formData.email || '')) return 'E-mail inválido.';
    if (!String(formData.password || '').trim()) return 'Senha é obrigatória.';
    if (formData.role === 'student' && !String(formData.turmaId || '').trim()) {
        return 'Selecione a turma do aluno.';
    }
    return null;
};

export const validateProductForm = (formData = {}) => {
    if (!String(formData.title || '').trim()) return 'Título é obrigatório.';
    if (!String(formData.link || '').trim()) return 'Link é obrigatório.';
    return null;
};
