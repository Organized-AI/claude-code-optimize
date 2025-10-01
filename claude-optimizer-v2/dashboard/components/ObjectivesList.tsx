'use client';

/**
 * ObjectivesList Component
 * Displays completed objectives with animation
 */

import { CheckCircle } from 'lucide-react';

interface ObjectivesListProps {
  objectives: string[];
  recentObjectives: string[];
}

export function ObjectivesList({ objectives, recentObjectives }: ObjectivesListProps) {
  if (objectives.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Objectives</h3>
        <div className="text-center text-gray-500 py-8">
          No objectives completed yet
        </div>
      </div>
    );
  }

  const isRecent = (objective: string) => recentObjectives.includes(objective);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Objectives</h3>
        <span className="text-sm text-gray-600">
          {objectives.length} completed
        </span>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {objectives.map((objective, index) => (
          <div
            key={`${objective}-${index}`}
            className={`
              flex items-start gap-3 p-3 rounded-lg transition-all
              ${isRecent(objective)
                ? 'bg-green-50 border-2 border-green-200 animate-pulse'
                : 'bg-gray-50 border border-gray-200'
              }
            `}
          >
            <CheckCircle
              className={`
                w-5 h-5 flex-shrink-0 mt-0.5
                ${isRecent(objective) ? 'text-green-600' : 'text-gray-400'}
              `}
            />
            <span className={`
              text-sm flex-1
              ${isRecent(objective) ? 'text-gray-900 font-medium' : 'text-gray-700'}
            `}>
              {objective}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
