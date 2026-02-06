import * as firebaseApp from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { debugLogger } from '../utils/debugLogger';

// ⚠️ IMPORTANT : Remplacez ces valeurs par celles de votre projet Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBnr7k2ly4uaRnGFhwXnpxdgm2WJpXojaI",
  authDomain: "timeedit-pro-ded.firebaseapp.com",
  projectId: "timeedit-pro-ded",
  storageBucket: "timeedit-pro-ded.firebasestorage.app",
  messagingSenderId: "1011694767932",
  appId: "1:1011694767932:web:ee12680165aca1d5bc1839"
};

let app;
let auth;
let db;

try {
    debugLogger.info('Firebase: Initializing...', { projectId: firebaseConfig.projectId });
    
    // "100% Béton" Init: On utilise un nom explicite "main"
    const appName = "main";
    
    // Access exports dynamically to bypass potential environment type issues
    const { initializeApp, getApps, getApp } = firebaseApp as any;
    
    const apps = getApps ? getApps() : [];
    const existingApp = apps.find((a: any) => a.name === appName);

    // @ts-ignore
    app = existingApp ? getApp(appName) : initializeApp(firebaseConfig, appName);
    
    auth = getAuth(app);
    db = getFirestore(app);

    debugLogger.success('Firebase: Initialized successfully', { appName: app.name });
} catch (error: any) {
    debugLogger.error('Firebase: Initialization FAILED', { error: error.message });
    throw error;
}

export { auth, db };