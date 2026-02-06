import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { debugLogger } from '../utils/debugLogger';
import { saveUserProfile } from '../services/db';
import { UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  loading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'user',
  loading: true,
  signOut: async () => {},
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>('user');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupAuthListener = () => {
        debugLogger.info('Auth: Setting up listener...');
        setLoading(true);

        // On utilise l'export 'auth' qui est mis à jour dynamiquement dans services/firebase.ts
        unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                debugLogger.success('Auth: User is logged in', { uid: currentUser.uid });
                
                // 1. Sauvegarde profil basique
                await saveUserProfile(currentUser);

                // 2. Récupération du rôle
                try {
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    const userSnap = await getDoc(userDocRef);
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        const fetchedRole = userData.role === 'admin' ? 'admin' : 'user';
                        setRole(fetchedRole);
                    } else {
                        setRole('user');
                    }
                } catch (error) {
                    debugLogger.error('Auth: Failed to fetch role', error);
                    setRole('user');
                }

            } else {
                debugLogger.info('Auth: No user logged in');
                setRole('user');
                setUser(null);
            }
            setUser(currentUser);
            setLoading(false);
        }, (error) => {
            debugLogger.error('Auth: Listener Error', error);
            setLoading(false);
        });
    };

    // Initial setup
    setupAuthListener();

    // Re-connexion si l'environnement change
    const handleEnvChange = () => {
        debugLogger.info('AuthContext: Detected environment change. Re-binding auth listener.');
        if (unsubscribe) unsubscribe();
        // Petite pause pour laisser Firebase finir son initialisation
        setTimeout(setupAuthListener, 50);
    };

    window.addEventListener('firebase-env-changed', handleEnvChange);

    return () => {
        if (unsubscribe) unsubscribe();
        window.removeEventListener('firebase-env-changed', handleEnvChange);
    };
  }, []);

  const signOut = async () => {
    try {
        debugLogger.info('Auth: Signing out...');
        await firebaseSignOut(auth);
        setRole('user');
        debugLogger.success('Auth: Signed out');
    } catch (e: any) {
        debugLogger.error('Auth: Sign out failed', e.message);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut, isAdmin: role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
};
