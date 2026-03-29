import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import {
    addDoc,
    collection,
    query,
    where,
    getDocs,
    getCountFromServer,
    limit,
    doc,
    updateDoc,
    serverTimestamp,
    increment
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import {
    INVITE_LINKS_FALLBACK_PATH,
    INVITE_LINKS_PRIMARY_PATH,
    isPermissionDeniedError,
    keyToPath,
    pathToKey
} from '../lib/inviteLinks';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Check for Student Persistence
        const storedStudent = localStorage.getItem('edu_pro_student');
        if (storedStudent) {
            try {
                const studentData = JSON.parse(storedStudent);
                if (studentData && studentData.role === 'student') {
                    setCurrentUser(studentData);
                    setLoading(false); // Stop loading immediately if found
                    return; // Skip firebase check if local student found
                }
            } catch (e) {
                console.error("Invalid stored session");
                localStorage.removeItem('edu_pro_student');
            }
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Admin logged in via Firebase Auth
                try {
                    // Buscar informações adicionais do Admin no Firestore (para reidratar os novos campos de perfil)
                    const adminRef = doc(db, "users", user.uid);
                    const querySnapshot = await getDocs(query(collection(db, "users"), where("email", "==", user.email)));

                    let adminData = {
                        id: user.uid,
                        uid: user.uid,
                        email: user.email,
                        role: 'admin',
                        name: 'Administrador'
                    };

                    if (!querySnapshot.empty) {
                        adminData = { ...adminData, ...querySnapshot.docs[0].data(), id: querySnapshot.docs[0].id, role: 'admin' };
                    }

                    setCurrentUser(adminData);
                } catch (error) {
                    console.error("Erro ao processar login de Admin:", error);
                    setCurrentUser({
                        id: user.uid,
                        uid: user.uid,
                        email: user.email,
                        role: 'admin',
                        name: 'Administrador'
                    });
                }
            } else {
                // Only clear if not a persistent student (already handled above)
                if (!localStorage.getItem('edu_pro_student')) {
                    setCurrentUser(null);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const normalizeEmail = (email = '') => email.trim().toLowerCase();

    const getInviteByCode = async (inviteCode) => {
        const code = (inviteCode || '').trim();
        if (!code) throw new Error('Código de convite inválido.');

        const invitePaths = [INVITE_LINKS_PRIMARY_PATH, INVITE_LINKS_FALLBACK_PATH];
        let permissionDeniedFound = false;

        for (const invitePath of invitePaths) {
            try {
                const inviteQuery = query(
                    collection(db, ...invitePath),
                    where("code", "==", code),
                    limit(1)
                );
                const inviteSnap = await getDocs(inviteQuery);

                if (!inviteSnap.empty) {
                    return {
                        id: inviteSnap.docs[0].id,
                        _sourcePathKey: pathToKey(invitePath),
                        ...inviteSnap.docs[0].data()
                    };
                }
            } catch (error) {
                if (isPermissionDeniedError(error)) {
                    permissionDeniedFound = true;
                    continue;
                }
                throw error;
            }
        }

        if (permissionDeniedFound) {
            throw new Error("Sem permissão para validar o convite. Tente novamente após atualizar as regras do Firestore.");
        }

        throw new Error("Link de convite não encontrado.");
    };

    const getInviteUsageCount = async (inviteId) => {
        const usageQuery = query(
            collection(db, "users"),
            where("invitedByLinkId", "==", inviteId)
        );
        const usageSnap = await getCountFromServer(usageQuery);
        return usageSnap.data().count || 0;
    };

    const validateInvite = async (inviteCode) => {
        const invite = await getInviteByCode(inviteCode);

        if (invite.status === 'inactive') {
            throw new Error("Este link de convite está inativo.");
        }

        if (!invite.turmaId) {
            throw new Error("Este convite não está vinculado a uma turma.");
        }

        if (invite.expiresAt) {
            const expiresAt = invite.expiresAt?.seconds
                ? new Date(invite.expiresAt.seconds * 1000)
                : new Date(invite.expiresAt);
            if (new Date() > expiresAt) {
                throw new Error("Este link de convite já expirou.");
            }
        }

        const maxUses = Number(invite.maxUses || 0);
        if (maxUses > 0) {
            const usageCount = Number(invite.usedCount || 0) || await getInviteUsageCount(invite.id);
            if (usageCount >= maxUses) {
                throw new Error("Este link atingiu o limite máximo de inscrições.");
            }
        }

        return invite;
    };

    const buildInviteAccessPayload = (invite) => ({
        turmaId: invite.turmaId,
        allowedTrailIds: invite.allowedTrailIds || [],
        allowedCourseIds: invite.allowedCourseIds || [],
        invitedByLinkId: invite.id,
        invitedByLinkCode: invite.code,
        invitedAt: new Date().toISOString()
    });

    const incrementInviteUsage = async (invite) => {
        if (!invite?.id) return;
        const invitePathKey = invite._sourcePathKey || pathToKey(INVITE_LINKS_PRIMARY_PATH);
        try {
            await updateDoc(doc(db, ...keyToPath(invitePathKey), invite.id), {
                usedCount: increment(1),
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.warn("Não foi possível atualizar contador do convite:", error);
        }
    };

    const loginAdmin = async (email, password) => {
        return signInWithEmailAndPassword(auth, normalizeEmail(email), password);
    };

    const loginStudent = async (email, password, inviteCode = null) => {
        const normalizedEmail = normalizeEmail(email);
        const q = query(
            collection(db, "users"),
            where("email", "==", normalizedEmail),
            where("password", "==", password),
            where("role", "==", "student")
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const docId = querySnapshot.docs[0].id;
            const docData = querySnapshot.docs[0].data();

            let inviteUpdates = {};
            if (inviteCode) {
                const invite = await validateInvite(inviteCode);
                inviteUpdates = buildInviteAccessPayload(invite);
                await incrementInviteUsage(invite);
            }

            const studentData = {
                id: docId,
                ...docData,
                ...inviteUpdates,
                email: normalizedEmail,
                lastLoginAt: new Date().toISOString()
            };

            // Update in Firebase
            await updateDoc(doc(db, "users", docId), {
                ...inviteUpdates,
                lastLoginAt: serverTimestamp()
            });

            // Persist Session
            localStorage.setItem('edu_pro_student', JSON.stringify(studentData));
            setCurrentUser(studentData);
            return true;
        } else {
            throw new Error("Credenciais inválidas");
        }
    };

    const registerStudentWithInvite = async ({ name, email, password, inviteCode }) => {
        if (!name?.trim() || !email?.trim() || !password?.trim()) {
            throw new Error("Preencha nome, e-mail e senha.");
        }

        const normalizedEmail = normalizeEmail(email);
        const invite = await validateInvite(inviteCode);

        const existingUserQuery = query(
            collection(db, "users"),
            where("email", "==", normalizedEmail),
            limit(1)
        );
        const existingUserSnap = await getDocs(existingUserQuery);
        if (!existingUserSnap.empty) {
            throw new Error("Este e-mail já possui cadastro. Faça login para continuar.");
        }

        const invitePayload = buildInviteAccessPayload(invite);
        const studentPayload = {
            name: name.trim(),
            email: normalizedEmail,
            password,
            role: 'student',
            status: 'active',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.trim()}`,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            ...invitePayload
        };

        const docRef = await addDoc(collection(db, "users"), studentPayload);
        await incrementInviteUsage(invite);
        const studentData = { id: docRef.id, ...studentPayload };

        localStorage.setItem('edu_pro_student', JSON.stringify(studentData));
        setCurrentUser(studentData);
        return true;
    };

    const getInviteInfo = async (inviteCode) => {
        try {
            const invite = await validateInvite(inviteCode);
            const usageCount = await getInviteUsageCount(invite.id);
            return { valid: true, invite, usageCount };
        } catch (error) {
            return { valid: false, error: error.message || "Não foi possível validar o convite." };
        }
    };

    const logout = async () => {
        if (currentUser?.role === 'admin') {
            await signOut(auth);
        }
        localStorage.removeItem('edu_pro_student');
        setCurrentUser(null);
    };

    const updateCurrentUserLocally = (updates) => {
        if (!currentUser) return;
        const updatedUser = { ...currentUser, ...updates };
        setCurrentUser(updatedUser);

        // Atualizar localStorage com os novos dados se ele for um aluno
        if (updatedUser.role === 'student' || localStorage.getItem('edu_pro_student')) {
            localStorage.setItem('edu_pro_student', JSON.stringify(updatedUser));
        }
    };

    return (
        <AuthContext.Provider value={{
            currentUser,
            loading,
            loginAdmin,
            loginStudent,
            registerStudentWithInvite,
            getInviteInfo,
            logout,
            updateCurrentUserLocally
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
