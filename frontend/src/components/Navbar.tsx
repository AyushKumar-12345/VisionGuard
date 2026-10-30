import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Cpu,
  HardDrive,
  Info,
  Layers,
  PlaySquare,
  Server,
  ShieldCheck,
  Video,
  X
} from 'lucide-react';
import { HealthStatus } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  health: HealthStatus | null;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, health }) => {
  const [showTelemetry, setShowTelemetry] = useState(false);

  const navItems = [
    { id: 'overview', shortLabel: 'Overview', fullLabel: 'Overview', icon: BarChart3, color: 'text-blue-600' },
    { id: 'videos', shortLabel: 'Videos', fullLabel: 'Video Library', icon: Video, color: 'text-purple-600' },
    { id: 'analysis', shortLabel: 'Analysis', fullLabel: 'Live Analysis', icon: PlaySquare, color: 'text-indigo-600' },
    { id: 'analytics', shortLabel: 'Analytics', fullLabel: 'Traffic Analytics', icon: Activity, color: 'text-emerald-600' },
    { id: 'models', shortLabel: 'Benchmark', fullLabel: 'Model Benchmark', icon: Layers, color: 'text-amber-600' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b-2 border-zinc-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
            {/* Logo & Brand */}
            <div
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer shrink-0"
              onClick={() => setActiveTab('overview')}
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 shrink-0">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-black">
                    Vision<span className="text-indigo-600">Guard</span>
                  </span>
                  <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                    v1.0
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs - Never Cut Off, Perfectly Scaled */}
            <nav className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-2 sm:px-3 sm:py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-black hover:text-indigo-600 hover:bg-zinc-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.color}`} />
                    <span className="hidden 2xl:inline">{item.fullLabel}</span>
                    <span className="inline 2xl:hidden">{item.shortLabel}</span>
                  </button>
                );
              })}
            </nav>

            {/* Hardware & System Health Badges (Adaptive & Clickable) */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Online Status Pill */}
              <button
                onClick={() => setShowTelemetry(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-50 border-2 border-emerald-300 shadow-xs hover:bg-emerald-100/80 transition-all cursor-pointer"
                title="Click to view real-time system & hardware telemetry"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      health?.status === 'online' ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  ></span>
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      health?.status === 'online' ? 'bg-emerald-600' : 'bg-amber-500'
                    }`}
                  ></span>
                </span>
                <span className="font-extrabold text-emerald-950 text-xs hidden sm:inline">
                  {health?.status === 'online' ? 'Engine Online' : 'Connecting...'}
                </span>
                <Info className="w-3.5 h-3.5 text-emerald-700 hidden md:inline ml-0.5" />
              </button>

              {/* Hardware Telemetry Pill (Desktop / Wide screen) */}
              <div
                onClick={() => setShowTelemetry(true)}
                className="hidden xl:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white border-2 border-zinc-200 shadow-xs text-xs cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition-all"
                title="Click for full hardware metrics"
              >
                <div className="flex items-center gap-1.5 text-black font-bold">
                  <Cpu className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-zinc-600 font-semibold">CPU:</span>
                  <span className="text-blue-600 font-extrabold">
                    {health?.system_resources.cpu_usage_pct ?? 0}%
                  </span>
                </div>
                <span className="text-zinc-300">|</span>
                <div className="flex items-center gap-1.5 text-black font-bold">
                  <HardDrive className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-zinc-600 font-semibold">RAM:</span>
                  <span className="text-purple-600 font-extrabold">
                    {health?.system_resources.memory_used_gb ?? 0} GB
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Real-Time Hardware & Engine Telemetry Modal */}
      {showTelemetry && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-zinc-200 shadow-2xl max-w-lg w-full p-6 text-black space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b-2 border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-black">Hardware & Engine Telemetry</h3>
                  <p className="text-xs font-semibold text-zinc-600">Live edge CPU and inference runtime status</p>
                </div>
              </div>
              <button
                onClick={() => setShowTelemetry(false)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-black hover:bg-zinc-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Health Status Row */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-200 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-800 font-black">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Inference Engine</span>
                </div>
                <p className="text-sm font-black text-emerald-950 capitalize">{health?.status || 'Online'}</p>
                <p className="text-[11px] font-semibold text-emerald-700">FastAPI Async Gateway</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50 border-2 border-blue-200 space-y-1">
                <div className="flex items-center gap-1.5 text-blue-800 font-black">
                  <Server className="w-4 h-4 text-blue-600" />
                  <span>Database State</span>
                </div>
                <p className="text-sm font-black text-blue-950 capitalize">{health?.database || 'Healthy'}</p>
                <p className="text-[11px] font-semibold text-blue-700">Async SQLite / Postgres</p>
              </div>
            </div>

            {/* Resource Telemetry */}
            <div className="space-y-3 p-4 rounded-2xl bg-zinc-50 border-2 border-zinc-200 text-xs">
              <span className="font-black uppercase tracking-wider text-black block mb-2">Host Resource Allocation</span>

              {/* CPU Gauge */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold">
                  <span className="flex items-center gap-1 text-zinc-700">
                    <Cpu className="w-3.5 h-3.5 text-blue-600" /> CPU Utilization
                  </span>
                  <span className="text-blue-700 font-black font-mono">{health?.system_resources.cpu_usage_pct ?? 0}%</span>
                </div>
                <div className="w-full bg-zinc-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, health?.system_resources.cpu_usage_pct ?? 0)}%` }}
                  ></div>
                </div>
              </div>

              {/* RAM Usage */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between font-bold">
                  <span className="flex items-center gap-1 text-zinc-700">
                    <HardDrive className="w-3.5 h-3.5 text-purple-600" /> RAM Memory
                  </span>
                  <span className="text-purple-700 font-black font-mono">
                    {health?.system_resources.memory_used_gb ?? 0} GB / {health?.system_resources.memory_total_gb ?? 32} GB
                  </span>
                </div>
                <div className="w-full bg-zinc-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        (((health?.system_resources.memory_used_gb ?? 0) / (health?.system_resources.memory_total_gb ?? 32)) * 100)
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Deep Learning Acceleration Specs */}
            <div className="p-4 rounded-2xl bg-white border-2 border-zinc-200 text-xs space-y-2">
              <span className="font-black uppercase tracking-wider text-black block">Computer Vision Hardware Acceleration</span>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                <div className="p-2 bg-zinc-100 rounded-lg">
                  <span className="text-zinc-500 block text-[10px]">Processor</span>
                  <span className="text-black">{health?.environment.device_name || 'Intel Core Ultra 9'}</span>
                </div>
                <div className="p-2 bg-zinc-100 rounded-lg">
                  <span className="text-zinc-500 block text-[10px]">Inference Threads</span>
                  <span className="text-indigo-700 font-black font-mono">{health?.environment.inference_threads || 16} Worker Cores</span>
                </div>
                <div className="p-2 bg-zinc-100 rounded-lg">
                  <span className="text-zinc-500 block text-[10px]">Torch Runtime</span>
                  <span className="text-black font-mono">{health?.environment.torch_version || '2.2+ CPU'}</span>
                </div>
                <div className="p-2 bg-zinc-100 rounded-lg">
                  <span className="text-zinc-500 block text-[10px]">Python Engine</span>
                  <span className="text-black font-mono">{health?.environment.python_version || '3.12.10'}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowTelemetry(false)}
                className="px-4 py-2 rounded-xl bg-black text-white text-xs font-black hover:bg-zinc-800 transition-all cursor-pointer shadow-sm"
              >
                Close Telemetry Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
