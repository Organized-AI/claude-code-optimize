import React, { useState } from 'react';
import { ChevronDown, Code2, Shield } from 'lucide-react';

interface BatchedActivityProps {
  activities: any[];
}

export const BatchedActivityFeed: React.FC<BatchedActivityProps> = ({ activities }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="space-y-3">
      {activities.map((item, index) => {
        if (item.type === 'batch') {
          return (
            <div key={item.id} className="p-3 bg-white/5 rounded-lg border border-white/10">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setShowDetails(!showDetails)}
              >
                <div className="flex items-center gap-3">
                  <Code2 className="w-4 h-4 text-purple-400" />
                  <div>
                    <div className="font-medium text-white">{item.service}</div>
                    <div className="text-sm text-gray-400">{item.summary}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-gray-400">{item.lastActivity}</div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                </div>
              </div>
              
              {showDetails && (
                <div className="mt-3 pl-7 space-y-1">
                  {item.activities.map((activity: string, i: number) => (
                    <div key={i} className="text-xs text-gray-400">• {activity}</div>
                  ))}
                </div>
              )}
            </div>
          );
        }

        return (
          <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-blue-400" />
              <div>
                <div className="font-medium text-white">{item.service}</div>
                <div className="text-sm text-gray-400">{item.activity}</div>
              </div>
            </div>
            <div className="text-xs text-gray-400">{item.time}</div>
          </div>
        );
      })}
    </div>
  );
};
