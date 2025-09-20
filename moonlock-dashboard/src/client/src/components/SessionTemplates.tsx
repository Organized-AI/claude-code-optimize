import React, { useEffect, useState } from 'react';
import { SessionTemplate, SessionPhase } from '../../../shared/types';
import { useDataController } from '../hooks/useDataController';
import { Layout, Code, Bug, FileText, Plus, Check, ChevronRight } from 'lucide-react';

const templateIcons = {
  heavy_refactoring: Code,
  feature_development: Layout,
  bug_fixes: Bug,
  documentation: FileText,
  custom: Plus
};

export const SessionTemplates: React.FC = () => {
  const { session } = useDataController();
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<SessionTemplate | null>(null);
  const [currentPhase, setCurrentPhase] = useState<SessionPhase | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (session && selectedTemplate) {
      fetchCurrentPhase();
    }
  }, [session, selectedTemplate]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentPhase = async () => {
    if (!session) return;
    
    try {
      const response = await fetch(`/api/templates/sessions/${session.id}/current-phase`);
      if (response.ok) {
        const phase = await response.json();
        setCurrentPhase(phase);
      }
    } catch (error) {
      console.error('Error fetching current phase:', error);
    }
  };

  const applyTemplate = async (template: SessionTemplate) => {
    if (!session) return;
    
    try {
      setApplying(true);
      const response = await fetch(`/api/templates/sessions/${session.id}/apply-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id })
      });

      if (!response.ok) throw new Error('Failed to apply template');
      
      setSelectedTemplate(template);
      await fetchCurrentPhase();
    } catch (error) {
      console.error('Error applying template:', error);
    } finally {
      setApplying(false);
    }
  };

  const completePhase = async (phaseId: string) => {
    if (!session) return;
    
    try {
      const response = await fetch(
        `/api/templates/sessions/${session.id}/phases/${phaseId}/complete`,
        { method: 'POST' }
      );

      if (!response.ok) throw new Error('Failed to complete phase');
      
      await fetchCurrentPhase();
    } catch (error) {
      console.error('Error completing phase:', error);
    }
  };

  if (loading) {
    return (
      <div className="metric-card animate-pulse">
        <div className="h-6 bg-dark-700 rounded w-48 mb-4"></div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-dark-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="metric-card">
      <h3 className="text-lg font-semibold text-dark-200 mb-4 flex items-center">
        <Layout className="w-5 h-5 mr-2 text-moonlock-400" />
        Session Templates
      </h3>

      {!selectedTemplate ? (
        <div className="space-y-3">
          <p className="text-sm text-dark-400 mb-4">
            Choose a template to optimize your session for specific tasks
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates.map(template => {
              const Icon = templateIcons[template.type];
              return (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template)}
                  disabled={!session || applying}
                  className="group bg-dark-800 hover:bg-dark-700 rounded-lg p-4 text-left transition-all duration-200 border border-dark-700 hover:border-moonlock-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-dark-700 rounded-lg group-hover:bg-moonlock-500/20 transition-colors">
                      <Icon className="w-5 h-5 text-moonlock-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-dark-200 mb-1">
                        {template.name}
                      </h4>
                      <p className="text-xs text-dark-400 mb-2">
                        {Math.round(template.estimatedDuration / 60000)} min • 
                        {template.tokenBudget.toLocaleString()} tokens
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {template.phases.map((phase, idx) => (
                          <span 
                            key={idx}
                            className="text-xs bg-dark-900 rounded px-2 py-0.5 text-dark-400"
                          >
                            {phase.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Selected Template Header */}
          <div className="bg-dark-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-dark-200 flex items-center">
                {React.createElement(templateIcons[selectedTemplate.type], {
                  className: "w-4 h-4 mr-2 text-moonlock-400"
                })}
                {selectedTemplate.name}
              </h4>
              <button
                onClick={() => {
                  setSelectedTemplate(null);
                  setCurrentPhase(null);
                }}
                className="text-xs text-dark-400 hover:text-dark-200"
              >
                Change Template
              </button>
            </div>
            <div className="text-xs text-dark-400">
              Budget: {selectedTemplate.tokenBudget.toLocaleString()} tokens • 
              Duration: {Math.round(selectedTemplate.estimatedDuration / 60000)} min
            </div>
          </div>

          {/* Phases Progress */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-dark-300">Session Phases</h4>
            {selectedTemplate.phases.map((phase, index) => {
              const isCurrent = currentPhase?.id === phase.id;
              const isPast = currentPhase && phase.order < currentPhase.order;
              
              return (
                <div
                  key={phase.id}
                  className={`bg-dark-800 rounded-lg p-3 border transition-all ${
                    isCurrent 
                      ? 'border-moonlock-500 bg-moonlock-500/10' 
                      : 'border-dark-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mr-2 ${
                          isPast 
                            ? 'bg-green-500/20 text-green-400' 
                            : isCurrent 
                              ? 'bg-moonlock-500/20 text-moonlock-400'
                              : 'bg-dark-700 text-dark-400'
                        }`}>
                          {isPast ? <Check className="w-3 h-3" /> : index + 1}
                        </div>
                        <h5 className="font-medium text-dark-200">{phase.name}</h5>
                      </div>
                      
                      <div className="ml-8 space-y-2">
                        <div className="text-xs text-dark-400">
                          Est. {Math.round(phase.estimatedDuration / 60000)} min • 
                          {phase.estimatedTokens.toLocaleString()} tokens
                        </div>
                        
                        {isCurrent && (
                          <>
                            <div className="space-y-1">
                              <div className="text-xs text-dark-500">Goals:</div>
                              {phase.goals.map((goal, idx) => (
                                <div key={idx} className="flex items-start text-xs text-dark-400">
                                  <ChevronRight className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                                  {goal}
                                </div>
                              ))}
                            </div>
                            
                            <button
                              onClick={() => completePhase(phase.id)}
                              className="mt-2 px-3 py-1 bg-moonlock-500 hover:bg-moonlock-600 text-white rounded text-xs font-medium transition-colors"
                            >
                              Complete Phase
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};