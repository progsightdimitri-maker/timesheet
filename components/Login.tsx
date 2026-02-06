import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, getCurrentEnv, switchEnvironment } from '../services/firebase';
import { Button } from './Button';
import { Input } from './Input';
import { Clock, Lock, Mail, AlertCircle, Database, CheckCircle2 } from 'lucide-react';
import { debugLogger } from '../utils/debugLogger';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // État local pour le sélecteur, initialisé avec la config actuelle
  const [selectedEnv, setSelectedEnv] = useState<'prod' | 'dev'>(getCurrentEnv());

  // Si l'environnement change ailleurs (ex: via App.tsx puis déconnexion), on met à jour le sélecteur
  useEffect(() => {
    const syncEnv = () => setSelectedEnv(getCurrentEnv());
    window.addEventListener('firebase-env-changed', syncEnv);
    return () => window.removeEventListener('firebase-env-changed', syncEnv);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Vérifier si on doit changer d'environnement AVANT de tenter l'auth
      const current = getCurrentEnv();
      if (selectedEnv !== current) {
          debugLogger.info(`Login: Switching environment from ${current} to ${selectedEnv} before auth...`);
          await switchEnvironment(selectedEnv);
      }

      // 2. Procéder à l'authentification avec l'instance 'auth' (potentiellement mise à jour)
      debugLogger.info('Login: Attempting sign in', { email, env: selectedEnv });
      await signInWithEmailAndPassword(auth, email, password);
      debugLogger.success('Login: Successful');
      
    } catch (err: any) {
      debugLogger.error('Login: Failed', err.code);
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Email ou mot de passe incorrect.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Trop de tentatives. Veuillez réessayer plus tard.');
      } else {
        setError("Une erreur est survenue. Vérifiez l'environnement sélectionné.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 relative transition-colors duration-500">
      
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden relative z-10 border border-gray-200">
        
        {/* Bandeau supérieur coloré pour indiquer l'environnement */}
        <div className={`absolute top-0 right-0 left-0 h-1.5 ${selectedEnv === 'dev' ? 'bg-amber-500' : 'bg-blue-600'}`}></div>

        {/* En-tête - Toujours blanc avec texte noir */}
        <div className="px-8 py-10 text-center bg-white border-b border-gray-50">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-sm transition-colors duration-300 ${selectedEnv === 'dev' ? 'bg-amber-500' : 'bg-blue-600'}`}>
            <Clock className="w-8 h-8 text-white" />
          </div>
          
          <h1 className="text-2xl font-bold tracking-tight flex justify-center items-center gap-2 text-gray-900">
            TimeEdit Pro
            {selectedEnv === 'dev' && (
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 uppercase tracking-wide">
                    DEV
                </span>
            )}
          </h1>
          
          <p className="mt-2 text-sm text-gray-500">
            {selectedEnv === 'dev' ? 'Environnement de Test' : 'Connectez-vous à votre espace de travail.'}
          </p>
        </div>

        {/* Formulaire */}
        <div className="p-8 bg-white">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Sélecteur d'environnement */}
            <div className="relative">
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                    Environnement
                </label>
                <div className="relative">
                    <select
                        value={selectedEnv}
                        onChange={(e) => setSelectedEnv(e.target.value as 'prod' | 'dev')}
                        disabled={loading}
                        className={`block w-full appearance-none rounded-lg border shadow-sm py-2.5 pl-4 pr-10 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all cursor-pointer ${
                            selectedEnv === 'dev' 
                            ? 'border-amber-200 bg-amber-50/30 text-amber-900 focus:border-amber-500 focus:ring-amber-500' 
                            : 'border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                    >
                        <option value="prod">🚀 Production</option>
                        <option value="dev">🛠️ Développement</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                        {selectedEnv === 'dev' ? <Database className="w-4 h-4 text-amber-600" /> : <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@exemple.com"
                required
                icon={<Mail className="w-4 h-4" />}
                disabled={loading}
                className="text-gray-900 bg-white"
              />

              <Input
                label="Mot de passe"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                icon={<Lock className="w-4 h-4" />}
                disabled={loading}
                className="text-gray-900 bg-white"
              />
            </div>

            <Button 
              type="submit" 
              className={`w-full py-3 text-base font-bold mt-2 shadow-md transition-all active:scale-[0.98] ${
                selectedEnv === 'dev' 
                ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500' 
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              }`}
              isLoading={loading}
              disabled={loading}
            >
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </Button>
            
          </form>
        </div>
      </div>
    </div>
  );
};