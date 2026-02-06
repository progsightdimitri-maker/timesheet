import React, { useEffect, useState } from 'react';
import { debugLogger, LogEntry } from '../utils/debugLogger';
import { ChevronDown, Trash2, Activity } from 'lucide-react';

export const DebugConsole = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        return debugLogger.subscribe(setLogs);
    }, []);

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 bg-white text-blue-600 p-3 rounded-full shadow-lg z-[9999] hover:bg-gray-50 border border-blue-200 animate-pulse transition-all"
                title="Open Debug Console"
            >
                <Activity className="w-6 h-6" />
            </button>
        );
    }

    return (
        <div className="fixed bottom-0 right-0 w-full md:w-[600px] h-[300px] bg-white text-gray-800 font-mono text-xs z-[9999] shadow-2xl flex flex-col border-t border-l border-gray-200 rounded-tl-xl overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-3 bg-gray-50 border-b border-gray-200">
                <span className="font-bold flex items-center gap-2 text-gray-700">
                    <Activity className="w-4 h-4 text-blue-500" /> 
                    SYSTEM DIAGNOSTICS
                </span>
                <div className="flex gap-2">
                    <button 
                        onClick={() => debugLogger.info('Console cleared manually')} 
                        className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                        title="Clear logs"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setIsOpen(false)} 
                        className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
                        title="Close console"
                    >
                        <ChevronDown className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Logs Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white">
                {logs.length === 0 && (
                    <div className="text-gray-400 italic text-center mt-10">Waiting for events...</div>
                )}
                {logs.map(log => (
                    <div key={log.id} className="border-b border-gray-50 pb-2 last:border-0">
                        <div className="flex gap-2 items-start">
                            <span className="text-gray-400 whitespace-nowrap">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                            <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                                log.level === 'error' ? 'bg-red-100 text-red-700' : 
                                log.level === 'warn' ? 'bg-amber-100 text-amber-700' : 
                                log.level === 'success' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                                {log.level}
                            </span>
                             <span className={`flex-1 leading-relaxed ${log.level === 'error' ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                                {log.message}
                             </span>
                        </div>
                        {log.details && (
                            <div className="ml-14 mt-1.5 p-2 bg-gray-50 rounded border border-gray-100 text-gray-500 overflow-x-auto whitespace-pre-wrap text-[11px]">
                                {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : String(log.details)}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};