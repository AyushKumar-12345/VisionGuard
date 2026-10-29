import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { OverviewPage } from './pages/OverviewPage';
import { VideosPage } from './pages/VideosPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ModelComparisonPage } from './pages/ModelComparisonPage';
import {
  getAnalyticsOverview,
  getHealth,
  getJobs,
  getModels,
  getVideos
} from './api/client';
import { AnalyticsOverview, HealthStatus, JobDetail, ModelConfig, VideoItem } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [recentJobs, setRecentJobs] = useState<JobDetail[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string | undefined>(undefined);

  const loadGlobalData = async () => {
    try {
      const [hData, oData, vData, mData, jData] = await Promise.all([
        getHealth().catch(() => null),
        getAnalyticsOverview().catch(() => null),
        getVideos().catch(() => []),
        getModels().catch(() => []),
        getJobs().catch(() => []),
      ]);
      setHealth(hData);
      setOverview(oData);
      setVideos(vData);
      setModels(mData);
      setRecentJobs(jData);
    } catch (err) {
      console.error('Error fetching global application data', err);
    }
  };

  useEffect(() => {
    loadGlobalData();
    const interval = setInterval(loadGlobalData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigate = (tab: string, videoId?: string) => {
    if (videoId) {
      setSelectedVideoId(videoId);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        health={health}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <OverviewPage
            overview={overview}
            health={health}
            videos={videos}
            recentJobs={recentJobs}
            onNavigate={handleNavigate}
            onRefresh={loadGlobalData}
          />
        )}

        {activeTab === 'videos' && (
          <VideosPage
            videos={videos}
            onRefresh={loadGlobalData}
            onSelectVideoForAnalysis={(vid) => handleNavigate('analysis', vid)}
          />
        )}

        {activeTab === 'analysis' && (
          <AnalysisPage
            videos={videos}
            models={models}
            selectedVideoId={selectedVideoId}
            onRefresh={loadGlobalData}
          />
        )}

        {activeTab === 'analytics' && <AnalyticsPage />}

        {activeTab === 'models' && <ModelComparisonPage />}
      </main>

      {/* High-End Clean Footer */}
      <footer className="bg-white border-t-2 border-zinc-200 py-6 text-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-black">
            <span>VisionGuard &copy; 2026</span>
            <span className="text-zinc-300">&bull;</span>
            <span className="text-zinc-700">Multi-Model Traffic Intelligence & Vehicle Analytics</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-black">
            <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">FastAPI</span>
            <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200">PyTorch</span>
            <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">YOLOv8</span>
            <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200">ByteTrack</span>
            <span className="px-2.5 py-1 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200">Docker</span>
            <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">Kubernetes</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
