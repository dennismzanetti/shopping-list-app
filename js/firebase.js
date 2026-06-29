// js/firebase.js
// Firebase initialization — import { auth, db } from './firebase.js'

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyBpUygy_Y-4tDLeYJwPFI338kA4yG3n8uE",
  authDomain: "shoppinglist-bf78d.firebaseapp.com",
  projectId: "shoppinglist-bf78d",
  storageBucket: "shoppinglist-bf78d.firebasestorage.app",
  messagingSenderId: "9753469863",
  appId: "1:9753469863:web:8e9871309634749b6b0c82",
  measurementId: "G-Q9D8TDYE7N"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
export const provider = new GoogleAuthProvider();
