
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCupcKt2uioLQcyj0LrNGwIwXZ7MYDVsKE",
  authDomain: "biometric-f0000.firebaseapp.com",
  projectId: "biometric-f0000",
  storageBucket: "biometric-f0000.firebasestorage.app",
  messagingSenderId: "164846431061",
  appId: "1:164846431061:web:03b1eebb018e2038c09ddc",
  measurementId: "G-KEQZ95KQHE"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
