# Documentation TimeEdit Pro

## 📱 Aperçu
**TimeEdit Pro** est une application web moderne de suivi du temps (Time Tracking) conçue pour les freelances et les développeurs. Elle permet de gérer des projets, de suivre le temps passé sur différentes tâches en temps réel et de générer des rapports détaillés.

## 🛠️ Pile Technique (Stack)
- **Frontend** : [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Style** : [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) (icônes)
- **Backend & Persistance** : [Firebase Firestore](https://firebase.google.com/docs/firestore) (temps réel)
- **Authentification** : [Firebase Auth](https://firebase.google.com/docs/auth)
- **Intelligence Artificielle** : [Google Gemini API](https://ai.google.dev/) (modèle `gemini-1.5-flash-preview`)
- **Utilitaires** : `date-fns` pour la manipulation des dates.

## 🚀 Fonctionnalités Principales

### 1. Chronomètre (Timer)
- **Suivi en temps réel** : Lancement et arrêt d'un chronomètre pour une tâche spécifique.
- **Saisie rapide** : Possibilité de définir une description et un projet avant de lancer le timer.
- **Historique** : Affichage des entrées de temps groupées par semaine et par jour.
- **Édition** : Modification ou suppression des entrées existantes.

### 2. Gestion des Projets et Clients
- **Hiérarchie** : Organisation des projets par client (optionnel).
- **Personnalisation** : Attribution de couleurs uniques aux projets et clients pour une identification facile.
- **Tarification** : Définition de taux horaires par projet pour le calcul de la rentabilité.

### 3. Rapports et Statistiques
- **Tableau de bord** : Visualisation des heures totales, des revenus générés et du nombre de projets actifs.
- **Graphiques** : Graphique en barres empilées montrant l'activité mensuelle par projet.
- **Filtrage avancé** : Filtrage par année, par client, par projet et par statut de facturation.
- **Exportation** : Génération de rapports détaillés au format texte (.txt).

### 4. Intelligence Artificielle (IA)
- **Génération de descriptions** : Utilisation de Gemini pour suggérer des descriptions professionnelles et concises basées sur le contexte (projet, durée, date).

### 5. Administration et Paramètres
- **Mode Admin** : Accès privilégié pour la gestion globale (si activé).
- **Localisation** : Configuration de la devise et du format de date/heure local.
- **Console de débogage** : Outil intégré pour surveiller l'état de l'application et les appels Firebase.

## 📂 Structure du Projet
```text
/
├── components/         # Composants React (UI, Modals, Vues)
├── contexts/           # Contextes React (Authentification)
├── services/           # Services API (Firebase, Gemini, Base de données)
├── utils/              # Fonctions utilitaires
├── types.ts            # Définitions des interfaces TypeScript
├── App.tsx             # Composant principal (Root)
└── index.tsx           # Point d'entrée de l'application
```

## ⚙️ Configuration
L'application nécessite les variables d'environnement suivantes dans un fichier `.env.local` :
- `GEMINI_API_KEY` : Votre clé API Google AI Studio.
- Paramètres Firebase (automatiquement configurés via le service `firebase.ts`).

---
*Documentation générée par Antigravity.*
