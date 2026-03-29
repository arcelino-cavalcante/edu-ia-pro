import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyB1eVaSqOPsJ7qnOmm07kgws2LMs0QlUmo",
    authDomain: "banco-de-dados-cursos2.firebaseapp.com",
    projectId: "banco-de-dados-cursos2",
    storageBucket: "banco-de-dados-cursos2.firebasestorage.app",
    messagingSenderId: "728651925900",
    appId: "1:728651925900:web:35770f16d70ff66e3caea9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
