import React from 'react';
import {
  Activity,
  BarChart3,
  Cpu,
  HardDrive,
  Layers,
  PlaySquare,
  ShieldCheck,
  Video
} from 'lucide-react';
import { HealthStatus } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  health: HealthStatus | null;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, health }) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3, color: 'text-blue-600' },
    { id: 'videos', label: 'Video Library', icon: Video, color: 'text-purple-600' },
    { id: 'analysis', label: 'Live Analysis & Player', icon: PlaySquare, color: 'text-indigo-600' },
    { id: 'analytics', label: 'Traffic Analytics', icon: Activity, color: 'text-emerald-600' },
    { id: 'models', label: 'Model Benchmark', icon: Layers, color: 'text-amber-600' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b-2 border-zinc-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => setActiveTab('overview')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-black">
                  Vision<span className="text-indigo-600">Guard</span>
                </span>
                <span className="hidden xl:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                  CV Engine v1.0
                </span>
              </div>
              <p className="hidden 2xl:block text-[11px] font-semibold text-zinc-600">
                Multi-Model Traffic Intelligence & Vehicle Analytics
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-black hover:text-indigo-600 hover:bg-zinc-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.color}`} />
                  <span className="hidden lg:inline">{item.label}</span>
                  <span className="inline lg:hidden text-xs">
                    {item.id === 'overview' ? 'Overview' :
                     item.id === 'videos' ? 'Videos' :
                     item.id === 'analysis' ? 'Analysis' :
                     item.id === 'analytics' ? 'Analytics' : 'Benchmark'}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Hardware & System Health Badges */}
          <div className="hidden lg:flex items-center gap-2.5 text-xs">
            {/* Online Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border-2 border-emerald-300 shadow-xs">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${health?.status === 'online' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${health?.status === 'online' ? 'bg-emerald-600' : 'bg-amber-500'}`}></span>
              </span>
              <span className="font-extrabold text-emerald-950">
                {health?.status === 'online' ? 'Engine Online' : 'Connecting...'}
              </span>
            </div>

            {/* Hardware Telemetry Pill */}
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white border-2 border-zinc-200 shadow-xs">
              <div className="flex items-center gap-1.5 text-black font-bold">
                <Cpu className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-zinc-600 font-semibold">CPU:</span>
                <span className="text-blue-600 font-extrabold">{health?.system_resources.cpu_usage_pct ?? 0}%</span>
              </div>
              <span className="text-zinc-300">|</span>
              <div className="flex items-center gap-1.5 text-black font-bold">
                <HardDrive className="w-3.5 h-3.5 text-purple-600" />
                <span className="text-zinc-600 font-semibold">RAM:</span>
                <span className="text-purple-600 font-extrabold">{health?.system_resources.memory_used_gb ?? 0} GB</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
