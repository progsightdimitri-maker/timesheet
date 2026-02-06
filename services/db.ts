
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  Timestamp,
  updateDoc,
  where,
  orderBy,
  writeBatch,
  getDocs,
  getDoc,
  collectionGroup
} from 'firebase/firestore';
import { db } from './firebase';
import { TimeEntry, Project, AppSettings, Client, RefundRequest, RefundStatus } from '../types';
import { debugLogger } from '../utils/debugLogger';

// --- User Profile ---

export const saveUserProfile = async (user: any) => {
  try {
    debugLogger.info('DB: Saving User Profile', { uid: user.uid });
    const docRef = doc(db, 'users', user.uid);
    // Note: We do NOT overwrite the 'role' here, we only merge profile info
    await setDoc(docRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
      lastLogin: Timestamp.now()
    }, { merge: true });
    debugLogger.success('DB: User Profile Saved');
  } catch(e: any) {
    debugLogger.error('DB: Save User Profile Failed', e.message);
  }
};

// --- Projects ---

export const subscribeToProjects = (userId: string, callback: (projects: Project[]) => void) => {
  debugLogger.info('DB: Subscribing to Projects', { userId });
  const q = query(collection(db, `users/${userId}/projects`));
  return onSnapshot(q, (snapshot) => {
    const projects = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as Project));
    debugLogger.success(`DB: Projects loaded`, { count: projects.length });
    callback(projects);
  }, (error) => {
    debugLogger.error('DB: Projects Subscription Error', error);
  });
};

export const addProject = async (userId: string, project: Project) => {
  try {
    debugLogger.info('DB: Adding Project', { id: project.id });
    const docRef = doc(db, `users/${userId}/projects`, project.id);
    const data = JSON.parse(JSON.stringify(project));
    await setDoc(docRef, data);
    debugLogger.success('DB: Project Added');
  } catch(e: any) {
    debugLogger.error('DB: Add Project Failed', e.message);
    throw e;
  }
};

export const updateProject = async (userId: string, project: Project) => {
    try {
        debugLogger.info('DB: Updating Project', { id: project.id });
        const docRef = doc(db, `users/${userId}/projects`, project.id);
        const data = JSON.parse(JSON.stringify(project));
        await updateDoc(docRef, data);
        debugLogger.success('DB: Project Updated');
    } catch(e: any) {
        debugLogger.error('DB: Update Project Failed', e.message);
        throw e;
    }
};

export const deleteProject = async (userId: string, projectId: string) => {
  try {
    debugLogger.info('DB: Deleting Project', { projectId });
    await deleteDoc(doc(db, `users/${userId}/projects`, projectId));
    debugLogger.success('DB: Project Deleted');
  } catch(e: any) {
    debugLogger.error('DB: Delete Project Failed', e.message);
    throw e;
  }
};

// --- Clients ---

export const subscribeToClients = (userId: string, callback: (clients: Client[]) => void) => {
  debugLogger.info('DB: Subscribing to Clients');
  const q = query(collection(db, `users/${userId}/clients`));
  return onSnapshot(q, (snapshot) => {
    const clients = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        color: data.color
      } as Client;
    }).sort((a, b) => a.name.localeCompare(b.name));
    debugLogger.success(`DB: Clients loaded`, { count: clients.length });
    callback(clients);
  }, (error) => {
    debugLogger.error('DB: Clients Subscription Error', error);
  });
};

export const addClient = async (userId: string, clientData: { name: string, color?: string }) => {
    try {
        const clientName = clientData.name.trim();
        if (!clientName) throw new Error("Client name cannot be empty");

        debugLogger.info('DB: Adding Client', { clientName });

        // Use the name as the ID
        const docRef = doc(db, `users/${userId}/clients`, clientName);
        
        // Check for uniqueness before creating
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
             throw new Error("Impossible de créer ce client : Un client portant ce nom existe déjà.");
        }

        await setDoc(docRef, { name: clientName, color: clientData.color || '#6b7280' });
        debugLogger.success('DB: Client Added');
    } catch(e: any) {
        debugLogger.error('DB: Add Client Failed', e.message);
        throw e;
    }
};

export const deleteClient = async (userId: string, clientId: string) => {
    try {
        debugLogger.info('DB: Deleting Client', { clientId });

        // 1. Check for existing projects linked to this client
        // Since clientId is the name of the client, we check the 'client' field in projects
        const projectsQuery = query(
            collection(db, `users/${userId}/projects`), 
            where('client', '==', clientId) // clientId IS the name
        );
        const projectsSnap = await getDocs(projectsQuery);

        if (!projectsSnap.empty) {
            const count = projectsSnap.size;
            throw new Error(`Impossible de supprimer le client "${clientId}" car ${count} projet(s) y sont rattachés. Veuillez d'abord supprimer ou réassigner ces projets.`);
        }

        // 2. Proceed with deletion if safe
        const docRef = doc(db, `users/${userId}/clients`, clientId); 
        await deleteDoc(docRef);
        debugLogger.success('DB: Client Deleted');
    } catch(e: any) {
        debugLogger.error('DB: Delete Client Failed', e.message);
        throw e;
    }
};

export const updateClient = async (userId: string, client: Client, oldName: string) => {
  try {
    debugLogger.info('DB: Updating Client', { id: client.id, oldName, newName: client.name });
    
    const newId = client.name.trim();
    const oldId = client.id; // Usually holds the old name/ID
    
    // If name hasn't changed (ID remains same), just update the field
    if (newId === oldId) {
         const docRef = doc(db, `users/${userId}/clients`, oldId);
         await updateDoc(docRef, { color: client.color });
         debugLogger.success('DB: Client Color Updated');
         return;
    }

    // If Name changed, we must ensure the ID matches the new Name
    // 1. Check if new ID is available
    const newDocRef = doc(db, `users/${userId}/clients`, newId);
    const newDocSnap = await getDoc(newDocRef);
    if (newDocSnap.exists()) {
        throw new Error("Impossible de renommer : Un client portant ce nom existe déjà.");
    }

    const batch = writeBatch(db);

    // 2. Create new Document
    batch.set(newDocRef, { name: client.name, color: client.color });

    // 3. Delete old Document
    const oldDocRef = doc(db, `users/${userId}/clients`, oldId);
    batch.delete(oldDocRef);

    // 4. Update all projects that reference this client
    // Note: Projects reference the client by 'name' field currently, which was equal to ID
    if (oldName !== client.name) {
      const projectsQuery = query(
        collection(db, `users/${userId}/projects`), 
        where('client', '==', oldName)
      );
      const projectsSnap = await getDocs(projectsQuery);
      
      projectsSnap.forEach((projectDoc) => {
        batch.update(projectDoc.ref, { client: client.name });
      });
      debugLogger.info(`DB: Cascading update to ${projectsSnap.size} projects`);
    }

    await batch.commit();
    debugLogger.success('DB: Client Renamed and Re-IDed');
  } catch (e: any) {
    debugLogger.error('DB: Update Client Failed', e.message);
    throw e;
  }
};

// --- Time Entries ---

export const subscribeToEntries = (userId: string, callback: (entries: TimeEntry[]) => void) => {
  debugLogger.info('DB: Subscribing to Entries');
  const q = query(collection(db, `users/${userId}/timeEntries`));
  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date)
      } as TimeEntry;
    });
    debugLogger.success(`DB: Entries loaded`, { count: entries.length });
    callback(entries);
  }, (error) => {
    debugLogger.error('DB: Entries Subscription Error', error);
  });
};

export const saveTimeEntry = async (userId: string, entry: TimeEntry) => {
  try {
    debugLogger.info('DB: Saving Entry', { id: entry.id });
    const docRef = doc(db, `users/${userId}/timeEntries`, entry.id);
    await setDoc(docRef, {
        ...entry,
        date: Timestamp.fromDate(entry.date)
    });
    debugLogger.success('DB: Entry Saved');
  } catch(e: any) {
    debugLogger.error('DB: Save Entry Failed', e.message);
    throw e;
  }
};

export const deleteTimeEntry = async (userId: string, entryId: string) => {
    try {
        debugLogger.info('DB: Deleting Entry', { entryId });
        await deleteDoc(doc(db, `users/${userId}/timeEntries`, entryId));
        debugLogger.success('DB: Entry Deleted');
    } catch(e: any) {
        debugLogger.error('DB: Delete Entry Failed', e.message);
        throw e;
    }
};

// --- Settings ---

export const subscribeToSettings = (userId: string, callback: (settings: AppSettings) => void) => {
  debugLogger.info('DB: Subscribing to Settings');
  const docRef = doc(db, `users/${userId}/settings`, 'general');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      debugLogger.success('DB: Settings loaded');
      callback(docSnap.data() as AppSettings);
    } else {
      debugLogger.warn('DB: No settings found, using default');
      callback({ currency: 'USD', currencyLocale: 'en-US' });
    }
  }, (error) => {
    debugLogger.error('DB: Settings Subscription Error', error);
  });
};

export const saveSettings = async (userId: string, settings: AppSettings) => {
    try {
        debugLogger.info('DB: Saving Settings');
        const docRef = doc(db, `users/${userId}/settings`, 'general');
        await setDoc(docRef, settings, { merge: true });
        debugLogger.success('DB: Settings Saved');
    } catch(e: any) {
        debugLogger.error('DB: Save Settings Failed', e.message);
        throw e;
    }
};

// --- Refunds ---

export const subscribeToAllRefunds = (callback: (requests: RefundRequest[]) => void) => {
  debugLogger.info('DB: Subscribing to All Refunds');
  const q = query(collectionGroup(db, 'refundRequests'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt)
      } as RefundRequest;
    });
    debugLogger.success(`DB: All Refunds loaded`, { count: requests.length });
    callback(requests);
  }, (error) => {
    debugLogger.error('DB: All Refunds Subscription Error', error);
  });
};

export const subscribeToMyRefunds = (userId: string, callback: (requests: RefundRequest[]) => void) => {
  debugLogger.info('DB: Subscribing to My Refunds', { userId });
  const q = query(collection(db, `users/${userId}/refundRequests`), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt)
      } as RefundRequest;
    });
    debugLogger.success(`DB: My Refunds loaded`, { count: requests.length });
    callback(requests);
  }, (error) => {
    debugLogger.error('DB: My Refunds Subscription Error', error);
  });
};

export const addRefundRequest = async (userId: string, amount: number, reason: string, userEmail: string) => {
  try {
    debugLogger.info('DB: Adding Refund Request', { userId, amount });
    const docRef = doc(collection(db, `users/${userId}/refundRequests`));
    const newRequest: any = {
        userId,
        userEmail,
        amount,
        reason,
        status: 'pending',
        createdAt: Timestamp.now()
    };
    await setDoc(docRef, newRequest);
    debugLogger.success('DB: Refund Request Added');
  } catch(e: any) {
    debugLogger.error('DB: Add Refund Request Failed', e.message);
    throw e;
  }
};

export const updateRefundStatus = async (userId: string, requestId: string, status: RefundStatus) => {
  try {
    debugLogger.info('DB: Updating Refund Status', { requestId, status });
    const docRef = doc(db, `users/${userId}/refundRequests`, requestId);
    await updateDoc(docRef, { status });
    debugLogger.success('DB: Refund Status Updated');
  } catch(e: any) {
    debugLogger.error('DB: Update Refund Status Failed', e.message);
    throw e;
  }
};
