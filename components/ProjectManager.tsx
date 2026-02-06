import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, FolderDot, Building2, User, Archive, Loader2 } from 'lucide-react';
import { Project, TimeEntry, AppSettings, Client } from '../types';
import { Button } from './Button';
import { Input } from './Input';
import { ConfirmModal } from './ConfirmModal';

interface ProjectManagerProps {
  projects: Project[];
  // Legacy props replaced by specific handlers
  onUpdateProjects?: (projects: Project[]) => void;
  clients: Client[];
  onUpdateClients?: (clients: string[]) => void;
  
  // New Handlers (Async expected for error handling)
  onAddProject: (p: Project) => Promise<void> | void;
  onUpdateProject: (p: Project) => Promise<void> | void;
  onDeleteProject: (id: string) => Promise<void> | void;
  onAddClient: (name: string, color?: string) => Promise<void> | void;
  onUpdateClient: (client: Client, oldName: string) => Promise<void> | void;
  onDeleteClient: (id: string) => Promise<void> | void;

  entries: TimeEntry[];
  settings: AppSettings;
}

const COLORS = [
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#10b981', // Green
  '#6b7280', // Gray
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ef4444', // Red
  '#14b8a6', // Teal
];

export const ProjectManager: React.FC<ProjectManagerProps> = ({ 
  projects, 
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  clients,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  entries,
  settings
}) => {
  // Modal States
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Deletion States (Projects)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  // Deletion States (Clients)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeletingClient, setIsDeletingClient] = useState(false);

  // Project Form State
  const [projName, setProjName] = useState('');
  const [projClient, setProjClient] = useState('');
  const [projColor, setProjColor] = useState(COLORS[0]);
  const [projActive, setProjActive] = useState(true);
  const [projRate, setProjRate] = useState<string>('');

  // Client Form State
  const [clientNameInput, setClientNameInput] = useState('');
  const [clientColor, setClientColor] = useState(COLORS[0]);

  // --- Project Modal Logic ---

  const openProjectModal = (project?: Project, preselectedClient?: string) => {
    if (project) {
      setEditingProject(project);
      setProjName(project.name);
      setProjClient(project.client || '');
      setProjColor(project.color);
      setProjActive(project.active !== false); 
      setProjRate(project.rate ? project.rate.toString() : '');
    } else {
      setEditingProject(null);
      setProjName('');
      setProjClient(preselectedClient || '');
      setProjColor(COLORS[0]);
      setProjActive(true);
      setProjRate('');
    }
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = async () => {
    if (!projName.trim()) return;

    try {
        // If the user typed a client that doesn't exist in the list, try to add it
        if (projClient && !clients.find(c => c.name === projClient)) {
            await onAddClient(projClient, COLORS[0]);
        }

        const rate = projRate ? parseFloat(projRate) : undefined;

        if (editingProject) {
          // Update
          await onUpdateProject({
              ...editingProject,
              name: projName,
              client: projClient || undefined,
              color: projColor,
              active: projActive,
              rate: rate
          });
        } else {
          // Create
          const newProject: Project = {
            id: crypto.randomUUID(),
            name: projName,
            client: projClient || undefined,
            color: projColor,
            active: projActive,
            rate: rate
          };
          await onAddProject(newProject);
        }
        setIsProjectModalOpen(false);
    } catch (error: any) {
        alert(error.message || "Une erreur est survenue lors de l'enregistrement du projet.");
    }
  };

  const initiateDeleteProject = (project: Project) => {
    const hasEntries = entries.some(entry => entry.project === project.id);

    if (hasEntries) {
      // Logic handled visually in ProjectRow now
      return;
    }

    setProjectToDelete(project);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    
    setIsDeletingProject(true);
    try {
      await onDeleteProject(projectToDelete.id);
      setProjectToDelete(null);
    } catch (error: any) {
      alert(error.message || "Erreur lors de la suppression du projet.");
    } finally {
      setIsDeletingProject(false);
    }
  };

  // --- Client Modal Logic ---

  const openClientModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setClientNameInput(client.name);
      setClientColor(client.color || COLORS[3]); // Default to gray if undefined
    } else {
      setEditingClient(null);
      setClientNameInput('');
      setClientColor(COLORS[0]);
    }
    setIsClientModalOpen(true);
  };

  const handleSaveClient = async () => {
    if (!clientNameInput.trim()) return;
    
    // Optional: Local check for faster feedback, though DB handles it too
    const exists = clients.some(c => c.name.toLowerCase() === clientNameInput.toLowerCase() && c.id !== editingClient?.id);
    if (exists) {
        alert("Attention : Un client avec ce nom semble déjà exister.");
    }

    try {
        if (editingClient) {
          // Update
          await onUpdateClient({ ...editingClient, name: clientNameInput, color: clientColor }, editingClient.name);
        } else {
          // Create
          await onAddClient(clientNameInput, clientColor);
        }
        setClientNameInput('');
        setIsClientModalOpen(false);
    } catch (error: any) {
        alert(error.message || "Erreur lors de l'enregistrement du client.");
    }
  };

  const initiateDeleteClient = (client: Client) => {
    // Check if client has projects attached
    const hasProjects = projects.some(p => p.client === client.name);

    if (hasProjects) {
      // Logic handled visually in Client Header
      return;
    }

    setClientToDelete(client);
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;

    setIsDeletingClient(true);
    try {
        await onDeleteClient(clientToDelete.id);
        setClientToDelete(null);
    } catch (error: any) {
        alert(error.message || "Erreur lors de la suppression du client.");
    } finally {
        setIsDeletingClient(false);
    }
  };

  // --- Grouping Logic ---

  const projectsByClient = projects.reduce((acc, project) => {
    const key = project.client || 'No Client';
    if (!acc[key]) acc[key] = [];
    acc[key].push(project);
    return acc;
  }, {} as Record<string, Project[]>);
  
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Projects & Clients</h2>
          <p className="text-gray-500">Manage your projects and assign them to clients.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => openClientModal()} variant="secondary">
            <Building2 className="w-4 h-4 mr-2" />
            New Client
          </Button>
          <Button onClick={() => openProjectModal()}>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Render Explicit Clients */}
        {clients.map(client => {
          const clientProjects = projectsByClient[client.name] || [];
          const hasProjects = clientProjects.length > 0;
          
          return (
            <div key={client.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between group/header">
                 <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-3 shadow-sm ring-1 ring-gray-200" style={{ backgroundColor: client.color || '#ccc' }} />
                    <h3 className="font-bold text-gray-800 text-lg">{client.name}</h3>
                    <span className="ml-3 text-xs font-medium bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                      {clientProjects.length} projects
                    </span>
                 </div>
                 <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
                    <button 
                      onClick={() => openClientModal(client)}
                      className="text-gray-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded transition-colors"
                      title="Edit Client"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    
                    {hasProjects ? (
                        <div 
                          className="p-1.5 text-gray-300 relative cursor-not-allowed group/trash"
                          title="Impossible de supprimer : ce client a des projets actifs."
                        >
                          <div className="relative">
                            <Trash2 className="w-4 h-4" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-full h-[1.5px] bg-red-400/60 rotate-45 transform" />
                            </div>
                          </div>
                        </div>
                    ) : (
                        <button 
                          onClick={() => initiateDeleteClient(client)}
                          className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors"
                          title="Delete Client"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                 </div>
              </div>
              
              <div className="divide-y divide-gray-100">
                {clientProjects.length > 0 ? (
                  clientProjects.map(project => (
                    <ProjectRow 
                      key={project.id} 
                      project={project} 
                      hasEntries={entries.some(e => e.project === project.id)}
                      onEdit={() => openProjectModal(project)} 
                      onDelete={() => initiateDeleteProject(project)} 
                      settings={settings}
                    />
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-gray-400 italic bg-gray-50/30">
                    No projects yet
                  </div>
                )}
                
                {/* Add Project to this Client Button */}
                <button 
                  onClick={() => openProjectModal(undefined, client.name)}
                  className="w-full py-3 text-sm text-gray-500 hover:text-blue-600 hover:bg-gray-50 flex items-center justify-center font-medium transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add project to {client.name}
                </button>
              </div>
            </div>
          );
        })}

        {/* Render "No Client" Section if there are unassigned projects */}
        {projectsByClient['No Client'] && projectsByClient['No Client'].length > 0 && (
           <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden border-t-4 border-t-gray-300">
             <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center">
                <User className="w-4 h-4 text-gray-400 mr-2" />
                <h3 className="font-semibold text-gray-600">No Client Assigned</h3>
                <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                  {projectsByClient['No Client'].length} projects
                </span>
             </div>
             <div className="divide-y divide-gray-100">
               {projectsByClient['No Client'].map(project => (
                 <ProjectRow 
                   key={project.id} 
                   project={project} 
                   hasEntries={entries.some(e => e.project === project.id)}
                   onEdit={() => openProjectModal(project)} 
                   onDelete={() => initiateDeleteProject(project)}
                   settings={settings}
                 />
               ))}
             </div>
           </div>
        )}

        {projects.length === 0 && clients.length === 0 && (
          <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
            <FolderDot className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No projects or clients yet. Create your first one!</p>
          </div>
        )}
      </div>

      {/* --- Project Modal --- */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsProjectModalOpen(false)} />
            
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 text-left">
                  {editingProject ? 'Edit Project' : 'New Project'}
                </h3>
                <button onClick={() => setIsProjectModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <Input 
                  label="Project Name" 
                  value={projName} 
                  onChange={(e) => setProjName(e.target.value)} 
                  placeholder="e.g. Website Redesign"
                  autoFocus
                />
                
                <div className="text-left">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                  <div className="relative">
                    <input
                       list="clients-list"
                       className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white text-gray-900"
                       value={projClient}
                       onChange={(e) => setProjClient(e.target.value)}
                       placeholder="Select or type new client..."
                    />
                    <datalist id="clients-list">
                      {clients.map(c => <option key={c.id} value={c.name} />)}
                    </datalist>
                  </div>
                </div>

                <div>
                   <Input 
                     label={`Hourly Rate (${settings.currency})`}
                     type="number"
                     min="0"
                     step="0.01"
                     value={projRate} 
                     onChange={(e) => setProjRate(e.target.value)} 
                     placeholder="e.g. 100"
                   />
                </div>

                <div className="text-left">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setProjColor(c)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${projColor === c ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input 
                    type="checkbox" 
                    id="projActive" 
                    checked={projActive} 
                    onChange={(e) => setProjActive(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white"
                  />
                  <label htmlFor="projActive" className="text-sm text-gray-700 font-medium select-none">
                    Project is active
                  </label>
                </div>
                {!projActive && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded text-left">
                    Inactive projects won't appear in the time tracker selection list.
                  </p>
                )}
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setIsProjectModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveProject}>Save Project</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Client Modal --- */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsClientModalOpen(false)} />
            
            <div className="relative bg-white rounded-xl shadow-xl max-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 text-left">
                  {editingClient ? 'Edit Client' : 'New Client'}
                </h3>
                <button onClick={() => setIsClientModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <Input 
                  label="Client Name" 
                  value={clientNameInput} 
                  onChange={(e) => setClientNameInput(e.target.value)} 
                  placeholder="e.g. Acme Corp"
                  autoFocus
                />

                <div className="text-left">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client Color</label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setClientColor(c)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${clientColor === c ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setIsClientModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveClient}>{editingClient ? 'Save Changes' : 'Create Client'}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Project Deletion */}
      <ConfirmModal 
        isOpen={!!projectToDelete}
        title="Supprimer le projet"
        message={`Voulez-vous vraiment supprimer le projet "${projectToDelete?.name}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        isDestructive
        isLoading={isDeletingProject}
        onConfirm={confirmDeleteProject}
        onCancel={() => setProjectToDelete(null)}
      />

      {/* Confirmation Modal for Client Deletion */}
      <ConfirmModal 
        isOpen={!!clientToDelete}
        title="Supprimer le client"
        message={`Voulez-vous vraiment supprimer le client "${clientToDelete?.name}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        isDestructive
        isLoading={isDeletingClient}
        onConfirm={confirmDeleteClient}
        onCancel={() => setClientToDelete(null)}
      />

    </div>
  );
};

interface ProjectRowProps {
  project: Project;
  hasEntries: boolean;
  onEdit: () => void;
  onDelete: () => void;
  settings: AppSettings;
}

const ProjectRow: React.FC<ProjectRowProps> = ({ project, hasEntries, onEdit, onDelete, settings }) => (
  <div className={`p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group ${project.active === false ? 'opacity-60 bg-gray-50/50' : ''}`}>
    <div className="flex items-center">
      <div 
        className="w-3 h-3 rounded-full mr-3 shadow-sm ring-1 ring-gray-200" 
        style={{ backgroundColor: project.color }}
      />
      <div className="flex flex-col">
        <span className={`font-medium ${project.active === false ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
           {project.name}
        </span>
        {project.rate && (
           <span className="text-xs text-gray-400">
             {/* Simple formatting for list view */}
             {project.rate.toLocaleString(settings.currencyLocale, { style: 'currency', currency: settings.currency })}/h
           </span>
        )}
      </div>
      {project.active === false && (
        <span className="ml-3 text-[10px] uppercase font-bold text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded border border-gray-300">
          Archived
        </span>
      )}
    </div>
    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button 
        onClick={onEdit}
        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
      >
        <Edit2 className="w-4 h-4" />
      </button>
      
      {hasEntries ? (
        <div 
          className="p-1.5 text-gray-300 relative cursor-not-allowed group/trash"
          title="Impossible de supprimer : ce projet possède des entrées de temps."
        >
          <div className="relative">
            <Trash2 className="w-4 h-4" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-[1.5px] bg-red-400/60 rotate-45 transform" />
            </div>
          </div>
        </div>
      ) : (
        <button 
          onClick={onDelete}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Delete Project"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  </div>
);