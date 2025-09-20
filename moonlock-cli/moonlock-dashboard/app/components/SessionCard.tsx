'use client';

import { Session } from '@/app/types';
import { format } from 'date-fns';
import { Activity, Clock, Hash, Cpu } from 'lucide-react';

interface SessionCardProps {
  session: Session;
  isActive?: boolean;
}

export function SessionCard({ session, isActive }: SessionCardProps) {
  const statusColors = {
    active: 'bg-green-100 text-green-800 border-green-200',
    paused: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    completed: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
      isActive ? 'border-green-500' : 'border-gray-300'
    } hover:shadow-lg transition-shadow`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{session.name}</h3>
          <p className="text-sm text-gray-500 mt-1">{session.projectPath}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
          statusColors[session.status]
        }`}>
          {isActive && <Activity className="inline w-3 h-3 mr-1" />}
          {session.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <Cpu className="w-4 h-4 mr-2 text-gray-400" />
          <span>{session.provider} / {session.model}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Clock className="w-4 h-4 mr-2 text-gray-400" />
          <span>{format(new Date(session.lastUsed), 'MMM d, HH:mm')}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center text-sm">
          <Hash className="w-4 h-4 mr-2 text-gray-400" />
          <span className="text-gray-600">Tokens:</span>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-blue-600">In: {session.tokenUsage.input.toLocaleString()}</span>
          <span className="text-green-600">Out: {session.tokenUsage.output.toLocaleString()}</span>
          <span className="font-semibold text-gray-900">Total: {session.tokenUsage.total.toLocaleString()}</span>
        </div>
      </div>

      {session.metadata && (
        <div className="mt-3 flex gap-2">
          {session.metadata.language && (
            <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
              {session.metadata.language}
            </span>
          )}
          {session.metadata.framework && (
            <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded">
              {session.metadata.framework}
            </span>
          )}
        </div>
      )}
    </div>
  );
}