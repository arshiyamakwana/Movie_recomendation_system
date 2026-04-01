import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyChvKcMn4Wz_a6H7pPQkvhzQcPTm1KmYnU",
  authDomain: "moviesys-eb285.firebaseapp.com",
  projectId: "moviesys-eb285",
  storageBucket: "moviesys-eb285.firebasestorage.app",
  messagingSenderId: "719662705004",
  appId: "1:719662705004:web:e76decdafd529bdcb2eb49",
  measurementId: "G-54Y7TKKCV6"
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

// Initialize analytics only in browser environment
if (typeof window !== "undefined") {
  getAnalytics(app);
}

export default app;