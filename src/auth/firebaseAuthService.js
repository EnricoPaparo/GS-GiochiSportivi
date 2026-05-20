// Servizio Firebase Auth non ancora collegato alla UI.
// Lo useremo nello step successivo per sostituire gradualmente il login locale.

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { firebaseAuth } from "../firebase/firebaseApp.js";

export function listenFirebaseAuth(callback) {
  return onAuthStateChanged(firebaseAuth, callback);
}

export async function loginWithEmailPassword(email, password) {
  const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
  return credential.user;
}

export async function logoutFirebaseUser() {
  await signOut(firebaseAuth);
}

export function mapFirebaseUserToSession(user, role = "Docente") {
  if (!user) return null;
  return {
    id: user.uid,
    username: user.email || user.uid,
    email: user.email || "",
    role
  };
}
