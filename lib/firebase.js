import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDPxkqhJ9kk4ZXwWkWSXzsD_-D8jdX3vto",
  authDomain: "motos-34a81.firebaseapp.com",
  projectId: "motos-34a81",
  storageBucket: "motos-34a81.firebasestorage.app",
  messagingSenderId: "724405521153",
  appId: "1:724405521153:web:d52a30c884bdc7eee32900",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
