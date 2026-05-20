// Firebase bootstrap non ancora usato dall'app.
// Importa SDK modulari da CDN per restare compatibili con GitHub Pages senza build step.
// Quando attiveremo Firebase, questo modulo verra usato da auth/firestore services.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebaseConfig.js";

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firestoreDb = getFirestore(firebaseApp);
