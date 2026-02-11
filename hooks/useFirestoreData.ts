import { useState, useEffect } from 'react';
import { TimeEntry, Project, AppSettings, Client, License, Server, Domain } from '../types';
import * as dbService from '../services/db';

interface UseFirestoreDataReturn {
    projects: Project[];
    clients: Client[];
    entries: TimeEntry[];
    licenses: License[];
    servers: Server[];
    domains: Domain[];
    settings: AppSettings;
}

export const useFirestoreData = (userId: string | null): UseFirestoreDataReturn => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [licenses, setLicenses] = useState<License[]>([]);
    const [servers, setServers] = useState<Server[]>([]);
    const [domains, setDomains] = useState<Domain[]>([]);
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
        const unsubLicenses = dbService.subscribeToLicenses(userId, setLicenses);
        const unsubServers = dbService.subscribeToServers(userId, setServers);
        const unsubDomains = dbService.subscribeToDomains(userId, setDomains);
        const unsubSettings = dbService.subscribeToSettings(userId, setSettings);

        // Cleanup subscriptions on unmount or userId change
        return () => {
            unsubProjects();
            unsubClients();
            unsubEntries();
            unsubLicenses();
            unsubServers();
            unsubDomains();
            unsubSettings();
        };
    }, [userId]);

    return {
        projects,
        clients,
        entries,
        licenses,
        servers,
        domains,
        settings,
    };
};
