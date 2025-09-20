import React, { useState, useEffect } from 'react';
import { ChevronDown, Shield, HardDrive, Cpu, Wifi, Smartphone, AlertCircle } from 'lucide-react';

// React-Bits inspired components
const ParticleField = ({ density = 20, color = '#60A5FA' }) => {
  const particles = Array.from({ length: density }, (_, i) => (
    <div
      key={i}
      className="absolute rounded-full animate-float"
      style={{
        width: Math.random() * 4 + 'px',
        height: Math.random() * 4 + 'px',
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        backgroundColor: color,
        opacity: Math.random() * 0.5 + 0.2,
        animationDelay: Math.random() * 5 + 's',
        animationDuration: Math.random() * 10 + 10 + 's'
      }}
    />
  ));

  return <div className="absolute inset-0 overflow-hidden">{particles}</div>;
};

const PulseOrb = ({ status, size = 80 }) => {
  const colors = {
    good: 'from-green-400 to-emerald-600',
    warning: 'from-yellow-400 to-orange-600',
    critical: 'from-red-400 to-rose-600'
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${colors[status]} animate-pulse`} />
      <div className={`absolute inset-2 rounded-full bg-gradient-to-br ${colors[status]} opacity-80`} />
      <div className="absolute inset-0 rounded-full backdrop-blur-sm bg-white/10" />
    </div>
  );
};

const AnimatedNumber = ({ value, suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDisplayValue(prev => {
        const diff = value - prev;
        if (Math.abs(diff) < 0.1) return value;
        return prev + diff * 0.1;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [value]);

  return <span>{Math.round(displayValue)}{suffix}</span>;
};

const GlassCard = ({ children, className = '', glow = false }) => {
  return (
    <div className={`
      relative overflow-hidden rounded-2xl
      bg-white/5 backdrop-blur-xl
      border border-white/10
      ${glow ? 'shadow-2xl shadow-blue-500/20' : ''}
      ${className}
    `}>
      {glow && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value, unit, color, progress }) => {
  return (
    <GlassCard className="p-6 group hover:scale-105 transition-transform">
      <div className="flex items-center justify-between mb-4">
        <Icon className={`w-8 h-8 ${color}`} />
        <span className="text-2xl font-bold text-white">
          <AnimatedNumber value={value} suffix={unit} />
        </span>
      </div>
      <p className="text-sm text-gray-400 mb-2">{label}</p>
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`h-full bg-gradient-to-r ${color.replace('text-', 'from-')} to-transparent transition-all duration-500`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </GlassCard>
  );
};

const DeviceItem = ({ name, type, battery }) => {
  const icons = {
    bluetooth: '🎧',
    airpods: '🎧',
    magic: '🖱️',
    iphone: '📱'
  };

  const deviceIcon = Object.entries(icons).find(([key]) => 
    name.toLowerCase().includes(key)
  )?.[1] || '📱';

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{deviceIcon}</span>
        <span className="text-sm text-gray-300">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-white/20 rounded-full overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${
              battery > 50 ? 'from-green-400 to-green-600' : 
              battery > 20 ? 'from-yellow-400 to-yellow-600' : 
              'from-red-400 to-red-600'
            }`}
            style={{ width: `${battery}%` }}
          />
        </div>
        <span className="text-xs text-gray-400">{battery}%</span>
      </div>
    </div>
  );
};

export default function MoonlockDashboard() {
  const [systemHealth, setSystemHealth] = useState('good');
  const [metrics, setMetrics] = useState({
    cpu: 11,
    memory: 54,
    storage: 47.71,
    temperature: 119,
    networkUp: 6,
    networkDown: 6
  });

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        cpu: Math.max(5, Math.min(95, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(20, Math.min(90, prev.memory + (Math.random() - 0.5) * 5)),
        storage: prev.storage,
        temperature: Math.max(100, Math.min(150, prev.temperature + (Math.random() - 0.5) * 5)),
        networkUp: Math.max(0, prev.networkUp + (Math.random() - 0.5) * 2),
        networkDown: Math.max(0, prev.networkDown + (Math.random() - 0.5) * 3)
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-[420px] h-[800px] bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-indigo-900/90 text-white overflow-hidden relative">
      <ParticleField density={30} color="#60A5FA" />
      
      <div className="relative z-10 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <PulseOrb status={systemHealth} size={60} />
            <div>
              <h1 className="text-2xl font-bold">Mac Health: Good</h1>
              <p className="text-sm text-gray-300">Mac mini</p>
            </div>
          </div>
        </div>

        {/* Protection Status */}
        <GlassCard className="p-4" glow>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="font-medium">Protection by Moonlock</span>
            </div>
            <span className="text-green-400 text-sm">✓ Protected</span>
          </div>
          <p className="text-sm text-gray-300">Real-time malware monitor ON</p>
          <p className="text-xs text-gray-400 mt-1">Last file scanned: git-remote-http</p>
        </GlassCard>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            icon={HardDrive}
            label="Macintosh HD"
            value={metrics.storage}
            unit=" GB"
            color="text-orange-400"
            progress={75}
          />
          <MetricCard
            icon={Cpu}
            label="Memory"
            value={metrics.memory}
            unit="%"
            color="text-purple-400"
            progress={metrics.memory}
          />
        </div>

        {/* CPU and Network */}
        <div className="grid grid-cols-2 gap-4">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Cpu className="w-6 h-6 text-blue-400" />
              <span className="text-lg font-bold">
                <AnimatedNumber value={metrics.cpu} suffix="%" />
              </span>
            </div>
            <p className="text-sm text-gray-400">CPU Load</p>
            <p className="text-xs text-orange-400 mt-1">{metrics.temperature}°F</p>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Wifi className="w-6 h-6 text-green-400" />
              <div className="text-right">
                <p className="text-sm">↑ {metrics.networkUp.toFixed(1)} KB/s</p>
                <p className="text-sm">↓ {metrics.networkDown.toFixed(1)} KB/s</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">Wi-Fi</p>
          </GlassCard>
        </div>

        {/* Connected Devices */}
        <GlassCard className="p-4">
          <h3 className="font-medium mb-3 flex items-center justify-between">
            Connected Devices
            <button className="text-blue-400 text-sm hover:underline">Test Speed</button>
          </h3>
          <div className="space-y-2">
            <DeviceItem name="Jordaaan's Magic Mouse" type="mouse" battery={99} />
            <DeviceItem name="Jordaaan's AirPods Pro" type="airpods" battery={100} />
            <div className="text-center py-2">
              <p className="text-sm text-gray-400">2 more devices...</p>
            </div>
          </div>
        </GlassCard>

        {/* Recommendation */}
        <GlassCard className="p-4 border-pink-500/30 bg-pink-500/10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium mb-1">Allow Full Disk Access</h4>
              <p className="text-sm text-gray-300 mb-3">
                Let Moonlock find much more junk on your Mac by allowing Full Disk Access via System Settings.
              </p>
              <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">
                Allow Access...
              </button>
            </div>
          </div>
        </GlassCard>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          33% {
            transform: translateY(-20px) translateX(10px);
          }
          66% {
            transform: translateY(10px) translateX(-10px);
          }
        }
      `}</style>
    </div>
  );
}