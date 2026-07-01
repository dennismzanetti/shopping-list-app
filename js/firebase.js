// Firebase initialization - import { auth, db } from './firebase.js'
import { initializeApp }    from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js';
import { getFirestore }     from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            "AIzaSyBL1bRqxFhxJRDHp9GWlNDEAqv2T7xAc_s",
  authDomain:        "shopping-list-app-6a6b1.firebaseapp.com",
  projectId:         "shopping-list-app-6a6b1",
  storageBucket:     "shopping-list-app-6a6b1.appspot.com",
  messagingSenderId: "857982793908",
  appId:             "1:857982793908:web:43f4cfab84dddf9d3aced8"
};

const app = initializeApp(firebaseConfig);
export const auth     = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db       = getFirestore(app);
