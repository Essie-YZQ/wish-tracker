import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyBscYshoBZ6eB94OB2m9Jb0N2HPRFm-pW0",
  authDomain: "bloom-journal-2e692.firebaseapp.com",
  projectId: "bloom-journal-2e692",
  storageBucket: "bloom-journal-2e692.firebasestorage.app",
  messagingSenderId: "419365443549",
  appId: "1:419365443549:web:e1488bc7adfa6c51574834"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };