import React from 'react';
import {
  Activity,
  BarChart3,
  Cpu,
  Layers,
  PlaySquare,
  ShieldAlert,
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
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'videos', label: 'Video Library', icon: Video },
    { id: 'analysis', label: 'Live Analysis & Player', icon: PlaySquare },
    { id: 'analytics', label: 'Traffic Analytics', icon: Activity },
    { id: 'models', label: 'Multi-Model Benchmark', icon: Layers },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-zinc-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-950 flex items-center justify-center text-white shadow-md">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-zinc-950">
                Vision<span className="text-zinc-500">Guard</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                Multi-Model Traffic Intelligence
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 sm:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-md transition-all ${
                    isActive
                      ? 'bg-zinc-950 text-white shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Hardware & System Health Badge */}
          <div className="hidden lg:flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-zinc-50 border border-zinc-200">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${health?.status === 'online' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${health?.status === 'online' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </span>
              <span className="font-medium text-zinc-800">
                {health?.environment.device_name.split('(')[0] || 'CPU Optimized'}
              </span>
              <span className="text-zinc-400">|</span>
              <div className="flex items-center gap-1 text-zinc-600">
                <Cpu className="w-3.5 h-3.5" />
                <span>{health?.system_resources.cpu_usage_pct ?? 0}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

