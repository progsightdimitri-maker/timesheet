import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Download, PieChart, BarChart, FileText, Building2, Filter, ChevronLeft, ChevronRight, CheckSquare, Square, ChevronDown, Receipt, DollarSign, Clock, CreditCard, Globe, Server as ServerIcon } from 'lucide-react';
import { format, getMonth, isSameYear, eachMonthOfInterval } from 'date-fns';
import { TimeEntry, Project, AppSettings, Client, License, Server, Domain } from '../types';
import { Button } from './Button';

interface ReportsProps {
    entries: TimeEntry[];
    projects: Project[];
    settings: AppSettings;
    clients: Client[];
    licenses: License[];
    servers: Server[];
    domains: Domain[];
}

// Helper to calculate duration in hours
const getDurationInHours = (start: string, end: string) => {
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    let minutes = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (minutes < 0) minutes += 24 * 60;
    return minutes / 60;
};

const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
};

export const Reports: React.FC<ReportsProps> = ({ entries = [], projects = [], settings, clients = [], licenses = [], servers = [], domains = [] }) => {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedClientId, setSelectedClientId] = useState<string>('all');

    // Filters State
    const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
    const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'invoiced' | 'not-invoiced'>('all');

    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
    const projectDropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
                setIsProjectDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(settings.currencyLocale, { style: 'currency', currency: settings.currency }).format(amount);
    };

    // --- Data Processing ---

    // 1. Compute available projects based on Client Filter
    const availableProjects = useMemo(() => {
        let filtered = [];
        if (selectedClientId === 'all') {
            filtered = projects;
        } else if (selectedClientId === 'no-client') {
            filtered = projects.filter(p => !p.client);
        } else {
            const client = clients.find(c => c.id === selectedClientId);
            filtered = client ? projects.filter(p => p.client === client.name) : [];
        }
        // Sort by Client Name then Project Name
        return filtered.sort((a, b) => {
            const cA = a.client || 'zz';
            const cB = b.client || 'zz';
            if (cA !== cB) return cA.localeCompare(cB);
            return a.name.localeCompare(b.name);
        });
    }, [selectedClientId, projects, clients]);

    // 2. Sync project selection when client filter changes (Default to Select All)
    useEffect(() => {
        setSelectedProjectIds(new Set(availableProjects.map(p => p.id)));
    }, [availableProjects]);

    const toggleProject = (id: string) => {
        const newSet = new Set(selectedProjectIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedProjectIds(newSet);
    };

    const toggleAllProjects = () => {
        if (selectedProjectIds.size === availableProjects.length) {
            setSelectedProjectIds(new Set()); // Deselect all
        } else {
            setSelectedProjectIds(new Set(availableProjects.map(p => p.id))); // Select all
        }
    };

    const processedData = useMemo(() => {
        // Construct dates manually
        const yearStart = new Date(selectedYear, 0, 1);
        const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59, 999);

        const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

        // Determine active projects (Intersection of Available & Selected)
        const validIds = new Set(availableProjects.map(p => p.id));
        // Safe-guard: Use intersection to avoid using stale IDs from previous client selection
        const activeProjectIds = new Set(
            [...selectedProjectIds].filter(id => validIds.has(id))
        );

        // Filter Entries based on Year AND Selected Projects AND Invoice Status
        const yearEntries = entries.filter(e => {
            const matchesYear = isSameYear(e.date, yearStart);
            const matchesProject = activeProjectIds.has(e.project);

            let matchesInvoice = true;
            if (invoiceFilter === 'invoiced') {
                matchesInvoice = e.invoiced === true;
            } else if (invoiceFilter === 'not-invoiced') {
                matchesInvoice = e.invoiced !== true;
            }

            return matchesYear && matchesProject && matchesInvoice;
        });

        // Aggregate by Month & Build Legend Data
        const projectTotalsMap: Record<string, { id: string, name: string, color: string, totalHours: number }> = {};

        // Pre-calculate project totals for the legend
        yearEntries.forEach(entry => {
            const hours = getDurationInHours(entry.startTime, entry.endTime);
            if (!projectTotalsMap[entry.project]) {
                const proj = projects.find(p => p.id === entry.project);
                if (proj) {
                    projectTotalsMap[entry.project] = {
                        id: proj.id,
                        name: proj.name,
                        color: proj.color,
                        totalHours: 0
                    };
                }
            }
            if (projectTotalsMap[entry.project]) {
                projectTotalsMap[entry.project].totalHours += hours;
            }
        });

        const legendData = Object.values(projectTotalsMap).sort((a, b) => b.totalHours - a.totalHours);

        const monthlyData = months.map(monthDate => {
            const monthEntries = yearEntries.filter(e => getMonth(e.date) === getMonth(monthDate));

            // Calculate totals from time entries
            const totalHours = monthEntries.reduce((acc, entry) => {
                return acc + getDurationInHours(entry.startTime, entry.endTime);
            }, 0);

            const hoursAmount = monthEntries.reduce((acc, entry) => {
                const project = projects.find(p => p.id === entry.project);
                const hours = getDurationInHours(entry.startTime, entry.endTime);
                const rate = project?.rate || 0;
                return acc + (entry.billable ? hours * rate : 0);
            }, 0);

            // Calculate totals from licenses
            const licenseAmount = licenses.filter(l => {
                const matchesMonth = getMonth(l.date) === getMonth(monthDate) && isSameYear(l.date, yearStart);
                const matchesProject = activeProjectIds.has(l.project);
                let matchesInvoice = true;
                if (invoiceFilter === 'invoiced') matchesInvoice = l.invoiced === true;
                else if (invoiceFilter === 'not-invoiced') matchesInvoice = l.invoiced !== true;
                return matchesMonth && matchesProject && matchesInvoice;
            }).reduce((acc, l) => acc + l.price, 0);

            // Calculate totals from servers
            const serverAmount = servers.filter(s => {
                const matchesMonth = getMonth(s.date) === getMonth(monthDate) && isSameYear(s.date, yearStart);
                const matchesProject = activeProjectIds.has(s.project);
                let matchesInvoice = true;
                if (invoiceFilter === 'invoiced') matchesInvoice = s.invoiced === true;
                else if (invoiceFilter === 'not-invoiced') matchesInvoice = s.invoiced !== true;
                return matchesMonth && matchesProject && matchesInvoice;
            }).reduce((acc, s) => acc + s.price, 0);

            // Calculate totals from domains
            const domainAmount = domains.filter(d => {
                const matchesMonth = getMonth(d.date) === getMonth(monthDate) && isSameYear(d.date, yearStart);
                const matchesProject = activeProjectIds.has(d.project);
                let matchesInvoice = true;
                if (invoiceFilter === 'invoiced') matchesInvoice = d.invoiced === true;
                else if (invoiceFilter === 'not-invoiced') matchesInvoice = d.invoiced !== true;
                return matchesMonth && matchesProject && matchesInvoice;
            }).reduce((acc, d) => acc + d.price, 0);

            // Calculate Breakdown per Project for Stacked Chart
            const groupedByProject = monthEntries.reduce((acc, entry) => {
                const pid = entry.project;
                if (!acc[pid]) acc[pid] = 0;
                acc[pid] += getDurationInHours(entry.startTime, entry.endTime);
                return acc;
            }, {} as Record<string, number>);

            const projectBreakdown: { projectId: string; hours: number; color: string; name: string }[] = [];
            Object.entries(groupedByProject).forEach(([pid, hours]) => {
                const proj = projects.find(p => p.id === pid);
                if (proj) {
                    projectBreakdown.push({
                        projectId: pid,
                        hours: hours as number,
                        color: proj.color,
                        name: proj.name
                    });
                }
            });

            projectBreakdown.sort((a, b) => b.hours - a.hours);

            return {
                month: monthDate,
                totalHours,
                hoursAmount,
                licenseAmount,
                serverAmount,
                domainAmount,
                totalAmount: hoursAmount + licenseAmount + serverAmount + domainAmount,
                entryCount: monthEntries.length,
                projectBreakdown
            };
        });

        // Totals
        const grandTotalHours = monthlyData.reduce((acc, m) => acc + m.totalHours, 0);
        const grandTotalAmount = monthlyData.reduce((acc, m) => acc + m.totalAmount, 0);

        return { monthlyData, grandTotalHours, grandTotalAmount, relevantProjectIds: activeProjectIds, filteredProjects: availableProjects, legendData };
    }, [entries, projects, clients, selectedYear, availableProjects, selectedProjectIds, invoiceFilter, licenses, servers, domains]);

    // Helper to show current filter name
    const currentFilterName = useMemo(() => {
        if (selectedClientId === 'all') return 'All Clients';
        if (selectedClientId === 'no-client') return 'Internal / No Client';
        const c = clients.find(c => c.id === selectedClientId);
        return c ? c.name : 'Unknown Client';
    }, [selectedClientId, clients]);

    // --- Export Functionality ---
    const handleExport = () => {
        // 1. Get raw entries based on processed IDs AND Invoice status
        const exportEntries = entries.filter(e => {
            const matchesYear = isSameYear(e.date, new Date(selectedYear, 0, 1));
            const matchesProject = processedData.relevantProjectIds.has(e.project);
            let matchesInvoice = true;
            if (invoiceFilter === 'invoiced') matchesInvoice = e.invoiced === true;
            if (invoiceFilter === 'not-invoiced') matchesInvoice = e.invoiced !== true;

            return matchesYear && matchesProject && matchesInvoice;
        }).sort((a, b) => a.date.getTime() - b.date.getTime());

        // 2. Group by Client -> Project
        const groupedData: Record<string, Record<string, TimeEntry[]>> = {};

        exportEntries.forEach(entry => {
            const project = projects.find(p => p.id === entry.project);
            if (!project) return;

            const clientName = project.client || 'No Client / Internal';
            const projectName = project.name;

            if (!groupedData[clientName]) {
                groupedData[clientName] = {};
            }
            if (!groupedData[clientName][projectName]) {
                groupedData[clientName][projectName] = [];
            }
            groupedData[clientName][projectName].push(entry);
        });

        // 3. Build Text Content
        let textContent = `REPORT EXPORT - ${selectedYear}\n`;
        textContent += `Client Filter: ${currentFilterName}\n`;

        let invoiceStatusText = "All Statuses";
        if (invoiceFilter === 'invoiced') invoiceStatusText = "Invoiced Only";
        if (invoiceFilter === 'not-invoiced') invoiceStatusText = "Not Invoiced Only";
        textContent += `Billing Status: ${invoiceStatusText}\n`;

        textContent += `Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}\n`;
        textContent += `=================================================================\n\n`;

        Object.entries(groupedData).sort().forEach(([clientName, clientProjects]) => {
            textContent += `CLIENT: ${clientName}\n`;
            textContent += `-----------------------------------------------------------------\n`;

            Object.entries(clientProjects).sort().forEach(([projectName, projEntries]) => {
                textContent += `  PROJECT: ${projectName}\n`;

                let projectTotalHours = 0;

                projEntries.forEach(entry => {
                    const duration = getDurationInHours(entry.startTime, entry.endTime);
                    projectTotalHours += duration;

                    const dateStr = format(entry.date, 'dd/MM/yyyy');
                    const desc = entry.description ? ` - ${entry.description}` : '';
                    const invStatus = entry.invoiced ? '[INVOICED]' : '';

                    textContent += `    ${dateStr} | ${entry.startTime} - ${entry.endTime} | ${duration.toFixed(2)}h${desc} ${invStatus}\n`;
                });

                textContent += `    >>> TOTAL PROJECT: ${projectTotalHours.toFixed(2)} hours\n\n`;
            });
            textContent += `\n`;
        });

        textContent += `=================================================================\n`;
        textContent += `GRAND TOTAL: ${processedData.grandTotalHours.toFixed(2)} hours\n`;

        // 4. Trigger Download
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Report_${selectedYear}_${selectedClientId === 'all' ? 'All' : selectedClientId}_${invoiceFilter}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="max-w-6xl mx-auto px-6 py-8">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <button
                            onClick={() => setSelectedYear(selectedYear - 1)}
                            className="p-1 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                            title="Previous Year"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-gray-900 font-bold text-lg">{selectedYear}</span>
                        <button
                            onClick={() => setSelectedYear(selectedYear + 1)}
                            className="p-1 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                            title="Next Year"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <span className="text-gray-300 mx-2">|</span>
                        <p className="text-gray-500 text-sm">
                            Showing data for <span className="font-semibold text-gray-900">{processedData.relevantProjectIds.size}</span> projects
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 items-center">

                    {/* Invoice Status Selector */}
                    <div className="relative min-w-[160px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Receipt className="w-4 h-4 text-gray-500" />
                        </div>
                        <select
                            value={invoiceFilter}
                            onChange={(e) => setInvoiceFilter(e.target.value as any)}
                            className="appearance-none w-full bg-white border border-gray-300 text-gray-700 py-2 pl-9 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium cursor-pointer hover:border-blue-400 transition-colors text-sm"
                        >
                            <option value="all">Tout (Status)</option>
                            <option value="invoiced">Déjà Facturé</option>
                            <option value="not-invoiced">Non Facturé</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                            <ChevronDown className="w-4 h-4" />
                        </div>
                    </div>

                    {/* Client Selector */}
                    <div className="relative min-w-[160px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Building2 className="w-4 h-4 text-gray-500" />
                        </div>
                        <select
                            value={selectedClientId}
                            onChange={(e) => setSelectedClientId(e.target.value)}
                            className="appearance-none w-full bg-white border border-gray-300 text-gray-700 py-2 pl-9 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium cursor-pointer hover:border-blue-400 transition-colors text-sm"
                        >
                            <option value="all">Tout (Clients)</option>
                            <option disabled>──────────</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                            <option disabled>──────────</option>
                            <option value="no-client">No Client / Interne</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                            <ChevronDown className="w-4 h-4" />
                        </div>
                    </div>

                    {/* Project Multi-Select Dropdown */}
                    <div className="relative" ref={projectDropdownRef}>
                        <button
                            onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                            className="flex items-center justify-between w-full md:w-auto min-w-[160px] bg-white border border-gray-300 text-gray-700 py-2 pl-3 pr-3 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-blue-400 transition-colors text-sm font-medium"
                        >
                            <span className="truncate max-w-[140px]">
                                {selectedProjectIds.size === availableProjects.length
                                    ? 'All Projects'
                                    : `${selectedProjectIds.size} Project${selectedProjectIds.size !== 1 ? 's' : ''}`}
                            </span>
                            <ChevronDown className="w-4 h-4 ml-2 text-gray-500" />
                        </button>

                        {isProjectDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-[400px] flex flex-col">
                                <div className="p-2 border-b border-gray-100">
                                    <button
                                        onClick={toggleAllProjects}
                                        className="flex items-center w-full px-2 py-1.5 hover:bg-gray-50 rounded text-sm font-medium text-gray-700"
                                    >
                                        <div className={`w-4 h-4 mr-2 border rounded flex items-center justify-center ${selectedProjectIds.size === availableProjects.length ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                            {selectedProjectIds.size === availableProjects.length && <CheckSquare className="w-3 h-3 text-white" />}
                                        </div>
                                        Select All
                                    </button>
                                </div>

                                <div className="overflow-y-auto p-1 space-y-0.5">
                                    {availableProjects.length === 0 && (
                                        <div className="p-4 text-center text-xs text-gray-400">No projects found.</div>
                                    )}
                                    {availableProjects.map(project => {
                                        const isSelected = selectedProjectIds.has(project.id);
                                        return (
                                            <button
                                                key={project.id}
                                                onClick={() => toggleProject(project.id)}
                                                className="flex items-center w-full px-2 py-1.5 hover:bg-gray-50 rounded text-sm text-left group"
                                            >
                                                <div className={`w-4 h-4 mr-2 border rounded flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-blue-400'}`}>
                                                    {isSelected && <CheckSquare className="w-3 h-3 text-white" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="truncate font-medium text-gray-700">{project.name}</div>
                                                    {selectedClientId === 'all' && project.client && (
                                                        <div className="text-[10px] text-gray-400 truncate">{project.client}</div>
                                                    )}
                                                </div>
                                                <div className="w-2 h-2 rounded-full ml-2 flex-shrink-0" style={{ backgroundColor: project.color }} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <Button variant="secondary" className="hidden sm:flex" onClick={handleExport}>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <PieChart className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-medium text-gray-400 uppercase">Total Hours</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                        {processedData.grandTotalHours.toFixed(1)} <span className="text-lg font-medium text-gray-500">hrs</span>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                        Logged in {selectedYear}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                            <BarChart className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-medium text-gray-400 uppercase">Total Earnings</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                        {formatCurrency(processedData.grandTotalAmount)}
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                        Billable amount
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                            <FileText className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-medium text-gray-400 uppercase">Projects</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                        {processedData.relevantProjectIds.size}
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                        active in filter
                    </div>
                </div>
            </div>

            {/* Extra Stats: Licences vs Hours */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Prestations</p>
                            <p className="text-xl font-bold text-gray-900">{formatCurrency(processedData.monthlyData.reduce((acc, m) => acc + m.hoursAmount, 0))}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Licences</p>
                            <p className="text-xl font-bold text-gray-900">{formatCurrency(processedData.monthlyData.reduce((acc, m) => acc + m.licenseAmount, 0))}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                            <ServerIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Serveurs</p>
                            <p className="text-xl font-bold text-gray-900">{formatCurrency(processedData.monthlyData.reduce((acc, m) => acc + m.serverAmount, 0))}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Globe className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Domaines</p>
                            <p className="text-xl font-bold text-gray-900">{formatCurrency(processedData.monthlyData.reduce((acc, m) => acc + m.domainAmount, 0))}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-center gap-4">
                    <div className="text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rentabilité Globale</p>
                        <p className="text-2xl font-black text-blue-600">{formatCurrency(processedData.grandTotalAmount)}</p>
                    </div>
                </div>
            </div>

            {/* Monthly Breakdown Chart (Stacked Bar Chart) */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Monthly Activity</h3>
                <div className="h-64 flex items-stretch justify-between gap-2">
                    {processedData.monthlyData.map((data, idx) => {
                        const maxHours = Math.max(...processedData.monthlyData.map(d => d.totalHours), 1);

                        return (
                            <div key={idx} className="flex-1 flex flex-col items-center group relative">
                                {/* Bar Container */}
                                <div className="w-full relative flex-1 bg-gray-50 rounded-t-sm overflow-hidden flex flex-col-reverse justify-start">
                                    {/* Stacked Segments */}
                                    {data.projectBreakdown.map((segment) => {
                                        // Calculate height percentage relative to MAX hours of the chart (not just the month total)
                                        // This ensures the visual scale is consistent across all months
                                        const segmentHeightPercentage = maxHours > 0 ? (segment.hours / maxHours) * 100 : 0;

                                        return (
                                            <div
                                                key={segment.projectId}
                                                style={{
                                                    height: `${segmentHeightPercentage}%`,
                                                    backgroundColor: segment.color
                                                }}
                                                className="w-full hover:opacity-80 transition-opacity cursor-pointer border-t border-white/10"
                                                title={`${segment.name}: ${segment.hours.toFixed(2)}h`}
                                            />
                                        );
                                    })}
                                </div>

                                {/* Hover Tooltip (Total) - UPDATED TO WHITE MODE */}
                                {data.totalHours > 0 && (
                                    <div
                                        className="absolute top-0 -translate-y-full bg-white text-gray-900 text-[10px] font-bold py-1 px-2 rounded shadow-md border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none mb-2"
                                    >
                                        {data.totalHours.toFixed(1)}h Total
                                    </div>
                                )}

                                {/* X-Axis Label */}
                                <div className="mt-2 text-xs text-gray-500 font-medium rotate-0 sm:rotate-0 truncate w-full text-center">
                                    {format(data.month, 'MMM')}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Legend */}
                {processedData.legendData.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <div className="flex flex-wrap gap-x-6 gap-y-3 justify-center">
                            {processedData.legendData.map(item => (
                                <div key={item.id} className="flex items-center text-sm text-gray-600">
                                    <span
                                        className="w-3 h-3 rounded-full mr-2 shadow-sm"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span className="font-medium mr-1.5">{item.name}</span>
                                    <span className="text-gray-400 text-xs">({item.totalHours.toFixed(1)}h)</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Detailed Breakdown</h3>
                    <span className="text-xs text-gray-400">
                        {processedData.grandTotalHours > 0 ? `${processedData.grandTotalHours.toFixed(1)} hours total` : 'No data'}
                    </span>
                </div>
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <th className="px-6 py-4">Month</th>
                            <th className="px-6 py-4">Hours Logged</th>
                            <th className="px-6 py-4">Billable Amount</th>
                            <th className="px-6 py-4 text-right">Entries</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {processedData.monthlyData.map((data, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                    {format(data.month, 'MMMM yyyy')}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {formatDuration(data.totalHours)} <span className="text-gray-400">({data.totalHours.toFixed(1)}h)</span>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                    {formatCurrency(data.totalAmount)}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 text-right">
                                    {data.entryCount}
                                </td>
                            </tr>
                        ))}
                        {processedData.grandTotalHours === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic bg-gray-50/30">
                                    No data found for the current selection in {selectedYear}.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
};