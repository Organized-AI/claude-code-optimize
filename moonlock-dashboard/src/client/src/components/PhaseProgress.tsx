import React, { useState } from 'react';
import { useDataController } from '../hooks/useDataController';

interface PhaseData {
  name: string;
  progress: number;
  color: string;
  prompts: number;
  estimate: number;
}

export const PhaseProgress: React.FC = () => {
  const { phase: currentPhase } = useDataController();
  
  const phases: PhaseData[] = [
    { name: 'Architecture', progress: 100, color: 'bg-green-500', prompts: 8, estimate: 8 },
    { name: 'Implementation', progress: 100, color: 'bg-green-500', prompts: 22, estimate: 52 },  
    { name: 'Testing', progress: 100, color: 'bg-green-500', prompts: 5, estimate: 20 },
    { name: 'Documentation', progress: 100, color: 'bg-green-500', prompts: 10, estimate: 10 },
    { name: 'Optimization', progress: 100, color: 'bg-green-500', prompts: 7, estimate: 10 },
  ];

  return (
    <div className="space-y-4">
      {phases.map((phase, index) => (
        <div key={phase.name} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-dark-300 font-medium">{phase.name}</span>
            <div className="flex items-center space-x-2">
              <span className="text-dark-500 font-mono text-xs">
                {phase.prompts}/{phase.estimate}
              </span>
              <span className="text-dark-400 font-mono">{phase.progress}%</span>
            </div>
          </div>
          
          <div className="progress-bar h-2">
            <div 
              className={`progress-fill ${phase.color}`}
              style={{ width: `${phase.progress}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between text-xs text-dark-500">
            <span>Estimated: {phase.estimate} prompts</span>
            <span className={`font-medium ${
              phase.prompts <= phase.estimate ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {phase.prompts <= phase.estimate 
                ? `${Math.round((phase.estimate - phase.prompts) / phase.estimate * 100)}% under budget` 
                : `${Math.round((phase.prompts - phase.estimate) / phase.estimate * 100)}% over budget`
              }
            </span>
          </div>
        </div>
      ))}
      
      <div className="mt-6 p-3 bg-dark-800 rounded-lg border border-dark-700">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-dark-400">Current Status</span>
          <span className="text-moonlock-400 font-mono font-semibold">{currentPhase.current}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-dark-400">Total Prompts Used</span>
          <span className="text-green-400 font-mono font-semibold">{currentPhase.promptsUsed}/{currentPhase.totalPrompts}</span>
        </div>
        <div className="progress-bar h-1 mt-2">
          <div 
            className="progress-fill bg-green-400"
            style={{ width: `${Math.min(100, (currentPhase.promptsUsed / currentPhase.totalPrompts) * 100)}%` }}
          />
        </div>
        <p className="text-xs text-dark-500 mt-1">
          {currentPhase.totalPrompts - currentPhase.promptsUsed} prompts remaining • {Math.round((1 - currentPhase.promptsUsed / currentPhase.totalPrompts) * 100)}% efficiency gained
        </p>
      </div>
    </div>
  );
};