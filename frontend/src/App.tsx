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
    <div className="min-h-screen bg-white text-zinc-950 flex flex-col font-sans selection:bg-zinc-200">
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

      {/* Clean Footer */}
      <footer className="bg-white border-t border-zinc-200 py-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>VisionGuard &copy; 2026 — Multi-Model Traffic Intelligence and Vehicle Analytics</span>
          <span className="font-mono text-zinc-400">FastAPI &bull; PyTorch &bull; ByteTrack &bull; React &bull; Tailwind</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
