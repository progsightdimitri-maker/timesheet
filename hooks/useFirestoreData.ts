import { useState, useEffect } from 'react';
import { TimeEntry, Project, AppSettings, Client } from '../types';
import * as dbService from '../services/db';

interface UseFirestoreDataReturn {
    projects: Project[];
    clients: Client[];
    entries: TimeEntry[];
    settings: AppSettings;
}

export const useFirestoreData = (userId: string | null): UseFirestoreDataReturn => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [settings, setSettings] = useState<AppSettings>({
        currency: 'USD',
        currencyLocale: 'en-US'
    });

    useEffect(() => {
        if (!userId) return;

        // Subscribe to all Firestore collections
        const unsubProjects = dbService.subscribeToProjects(userId, setProjects);
        const unsubClients = dbService.subscribeToClients(userId, setClients);
        const unsubEntries = dbService.subscribeToEntries(userId, setEntries);
        const unsubSettings = dbService.subscribeToSettings(userId, setSettings);

        // Cleanup subscriptions on unmount or userId change
        return () => {
            unsubProjects();
            unsubClients();
            unsubEntries();
            unsubSettings();
        };
    }, [userId]);

    return {
        projects,
        clients,
        entries,
        settings,
    };
};
