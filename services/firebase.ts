import * as firebaseApp from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { debugLogger } from '../utils/debugLogger';

// Config PROD
const prodConfig = {
  apiKey: "AIzaSyDjOMJi5EQ21xHasOqRN0tW7LLuhDxwNns",
  authDomain: "timeedit-pro.firebaseapp.com",
  projectId: "timeedit-pro",
  storageBucket: "timeedit-pro.firebasestorage.app",
  messagingSenderId: "864259960844",
  appId: "1:864259960844:web:05d64abf8e398cd90efe29"
};

// Config DEV
const devConfig = {
  apiKey: "AIzaSyBnr7k2ly4uaRnGFhwXnpxdgm2WJpXojaI",
  authDomain: "timeedit-pro-ded.firebaseapp.com",
  projectId: "timeedit-pro-ded",
  storageBucket: "timeedit-pro-ded.firebasestorage.app",
  messagingSenderId: "1011694767932",
  appId: "1:1011694767932:web:ee12680165aca1d5bc1839"
};

// Variables mutables pour permettre le changement d'instance à la volée
export let app: any;
export let auth: Auth;
export let db: Firestore;

const APP_NAME = "main-app";

export const getCurrentEnv = (): 'prod' | 'dev' => {
  if (typeof window !== 'undefined') {
    const val = localStorage.getItem('app_env');
    if (val === 'dev') return 'dev';
    return 'prod';
  }
  return 'prod';
};

const initializeFirebase = (env: 'prod' | 'dev') => {
    const { initializeApp, getApps, getApp } = firebaseApp as any;
    const config = env === 'dev' ? devConfig : prodConfig;

    debugLogger.info(`Firebase: Initializing [${env.toUpperCase()}]`);

    const apps = getApps ? getApps() : [];
    const existingApp = apps.find((a: any) => a.name === APP_NAME);

    // Initialisation ou récupération de l'app existante
    app = existingApp ? getApp(APP_NAME) : initializeApp(config, APP_NAME);
    auth = getAuth(app);
    db = getFirestore(app);
};

// Initialisation au chargement du module
try {
    initializeFirebase(getCurrentEnv());
} catch (error: any) {
    debugLogger.error('Firebase: Initialization FAILED', { error: error.message });
}

/**
 * Bascule l'environnement Firebase dynamiquement sans recharger la page.
 * Supprime l'instance courante et en recrée une nouvelle.
 */
export const switchEnvironment = async (targetEnv: 'prod' | 'dev') => {
    const { deleteApp, initializeApp } = firebaseApp as any;
    
    // 1. Nettoyage de l'app existante
    if (app) {
        try {
            debugLogger.info('Firebase: Tearing down current app for switch...');
            await deleteApp(app);
        } catch (e) {
            console.warn("Error deleting app:", e);
        }
    }

    // 2. Mise à jour du stockage local
    localStorage.setItem('app_env', targetEnv);

    // 3. Ré-initialisation
    const config = targetEnv === 'dev' ? devConfig : prodConfig;
    app = initializeApp(config, APP_NAME);
    auth = getAuth(app);
    db = getFirestore(app);

    debugLogger.success(`Firebase: Switched to ${targetEnv.toUpperCase()} successfully`);

    // 4. Notification aux composants (notamment AuthContext)
    window.dispatchEvent(new Event('firebase-env-changed'));
};
