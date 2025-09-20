// src/client/src/components/SessionControl.tsx

import React, { useState, useEffect } from 'react';
import { Play, Square, Plus, ChevronUp, ChevronDown, Zap, Brain, Clock, Hash, Download, Upload } from 'lucide-react';
import { SessionLogger } from '../services/SessionLogger';

interface SessionControlProps {
  onSessionUpdate: () => void;
}

const logger = new SessionLogger();

export function SessionControl({ onSessionUpdate }: SessionControlProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [model, setModel] = useState<'sonnet' | 'opus'>('sonnet');
  const [sessionTime, setSessionTime] = useState('0m');
  const [promptCount, setPromptCount] = useState(0);
  
  // Check for active session on mount
  useEffect(() => {
    const active = logger.getActiveSession();
    if (active) {
      setActiveSession(active.id);
      setProjectName(active.project);
      setModel(active.model);
      setPromptCount(active.prompts.length);
    }
  }, []);
  
  // Update session time every minute
  useEffect(() => {
    if (!activeSession) return;
    
    const updateTime = () => {
      const active = logger.getActiveSession();
      if (active) {
        setSessionTime(logger.calculateDuration(active));
        setPromptCount(active.prompts.length);
      }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [activeSession]);
  
  const startSession = () => {
    if (!projectName.trim()) {
      alert('Please enter a project name');
      return;
    }
    
    const sessionId = logger.startSession(projectName, model);
    setActiveSession(sessionId);
    setPromptCount(0);
    setSessionTime('0m');
    onSessionUpdate();
  };
  
  const endSession = () => {
    if (activeSession) {
      logger.endSession(activeSession);
      setActiveSession(null);
      setProjectName('');
      setPromptCount(0);
      setSessionTime('0m');
      onSessionUpdate();
    }
  };
  
  const logPrompt = () => {
    if (!activeSession) return;
    
    const promptText = prompt('Paste your Claude Code prompt (or describe it):');
    if (promptText && promptText.trim()) {
      logger.logPrompt(activeSession, promptText);
      setPromptCount(prev => prev + 1);
      onSessionUpdate();
    }
  };
  
  const logQuickPrompt = (type: string) => {
    if (!activeSession) return;
    
    const templates = {
      'debug': 'Debug and fix the following error: [ERROR_DESCRIPTION]',
      'implement': 'Implement the following feature: [FEATURE_DESCRIPTION]',
      'refactor': 'Refactor this code for better performance: [CODE_DESCRIPTION]',
      'test': 'Write tests for: [COMPONENT_DESCRIPTION]',
      'document': 'Add documentation for: [CODE_DESCRIPTION]'
    };
    
    const template = templates[type as keyof typeof templates];
    const description = prompt(`${type.charAt(0).toUpperCase() + type.slice(1)} task:`, template);
    
    if (description) {
      logger.logPrompt(activeSession, description);
      setPromptCount(prev => prev + 1);
      onSessionUpdate();
    }
  };
  
  const exportSessions = () => {
    const data = logger.exportSessions();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claude-sessions-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const importSessions = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            logger.importSessions(e.target?.result as string);
            onSessionUpdate();
            alert('Sessions imported successfully!');
          } catch (error) {
            alert('Failed to import sessions. Please check the file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`bg-gray-900 border border-gray-700 rounded-lg shadow-2xl transition-all duration-200 ${
        isExpanded ? 'w-80' : 'w-48'
      }`}>
        {/* Header */}
        <div 
          className="flex items-center justify-between p-3 border-b border-gray-700 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <h3 className="text-sm font-medium text-gray-200">Session Control</h3>
          {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </div>
        
        {isExpanded && (
          <div className="p-3 space-y-3">
            {!activeSession ? (
              // Start Session UI
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Project name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && startSession()}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none focus:border-blue-500"
                />
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setModel('sonnet')}
                    className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                      model === 'sonnet' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <Zap size={14} className="inline mr-1" />
                    Sonnet 4
                  </button>
                  <button
                    onClick={() => setModel('opus')}
                    className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                      model === 'opus' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <Brain size={14} className="inline mr-1" />
                    Opus 4
                  </button>
                </div>
                
                <button
                  onClick={startSession}
                  disabled={!projectName.trim()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
                >
                  <Play size={16} /> Start Session
                </button>
              </div>
            ) : (
              // Active Session UI
              <div className="space-y-3">
                <div className="bg-gray-800 rounded p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Project:</span>
                    <span className="font-medium">{projectName}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Model:</span>
                    <span className={`font-medium ${model === 'opus' ? 'text-purple-400' : 'text-blue-400'}`}>
                      {model === 'opus' ? 'Opus 4' : 'Sonnet 4'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Clock size={14} /> Duration:
                    </span>
                    <span className="font-medium">{sessionTime}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Hash size={14} /> Prompts:
                    </span>
                    <span className="font-medium">{promptCount}</span>
                  </div>
                </div>
                
                <button
                  onClick={logPrompt}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
                >
                  <Plus size={16} /> Log Prompt
                </button>
                
                {/* Quick prompt buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => logQuickPrompt('debug')}
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
                  >
                    Debug
                  </button>
                  <button
                    onClick={() => logQuickPrompt('implement')}
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
                  >
                    Implement
                  </button>
                  <button
                    onClick={() => logQuickPrompt('refactor')}
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
                  >
                    Refactor
                  </button>
                  <button
                    onClick={() => logQuickPrompt('test')}
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
                  >
                    Test
                  </button>
                </div>
                
                <button
                  onClick={endSession}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition-colors"
                >
                  <Square size={16} /> End Session
                </button>
              </div>
            )}
            
            {/* Import/Export buttons */}
            <div className="flex gap-2 pt-2 border-t border-gray-700">
              <button
                onClick={exportSessions}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
                title="Export all sessions as JSON"
              >
                <Download size={12} /> Export
              </button>
              <button
                onClick={importSessions}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
                title="Import sessions from JSON"
              >
                <Upload size={12} /> Import
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
