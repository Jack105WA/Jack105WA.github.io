
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
    getAuth,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDHpHE5AqdjV_sfFNMDmUCocRpEQ54Ep0s",
    authDomain: "jack105wa-web-server.firebaseapp.com",
    projectId: "jack105wa-web-server",
    storageBucket: "jack105wa-web-server.firebasestorage.app",
    messagingSenderId: "601368057403",
    appId: "1:601368057403:web:008ae7bd047ac3f5fcee1e"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export const authPersistence = setPersistence(
    auth,
    browserLocalPersistence
);
