
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBj_fhhi2Rd9zhX4GR9iV9Lud0tnD1Dn58",
  authDomain: "flood-monitoring-6a4d0.firebaseapp.com",
  databaseURL: "https://flood-monitoring-6a4d0-default-rtdb.firebaseio.com",
  projectId: "flood-monitoring-6a4d0",
  storageBucket: "flood-monitoring-6a4d0.firebasestorage.app",
  messagingSenderId: "514740774560",
  appId: "1:514740774560:web:1bbcc150ca38e0b07e0bc5",
  measurementId: "G-92DTLSV8WY"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
