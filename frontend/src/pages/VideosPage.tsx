import React, { useState } from 'react';
import {
  Film,
  Play,
  Trash2,
  UploadCloud,
  Video
} from 'lucide-react';
import { VideoItem } from '../types';
import { deleteVideo, uploadVideo } from '../api/client';

interface VideosPageProps {
  videos: VideoItem[];
  onRefresh: () => void;
  onSelectVideoForAnalysis: (videoId: string) => void;
}

export const VideosPage: React.FC<VideosPageProps> = ({
  videos,
  onRefresh,
  onSelectVideoForAnalysis,
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setErrorMsg(null);

    try {
      await uploadVideo(file, (p) => setProgress(p));
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to upload video');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (videoId: string, filename: string) => {
    if (!window.confirm(`Are you sure you want to delete ${filename}? All associated jobs and annotated videos will be permanently purged.`)) {
      return;
    }
    try {
      await deleteVideo(videoId);
      onRefresh();
    } catch (err: any) {
      alert(`Error deleting video: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8 bg-white text-black">
      {/* Header */}
      <div className="pb-6 border-b-2 border-zinc-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-300">
            Surveillance Media Repository
          </span>
        </div>
        <h1 className="text-3xl font-black text-black tracking-tight">
          Video Ingestion & Stream Management
        </h1>
        <p className="text-sm font-semibold text-zinc-700 mt-1 max-w-3xl">
          Ingest, catalog, and inspect traffic surveillance footage. All files undergo byte-level binary signature validation, OpenCV keyframe decoding, and SHA-256 fingerprinting.
        </p>
      </div>

      {/* Upload Dropzone (Pure White Card, Rich Accent Colors) */}
      <div className="bg-white p-7 rounded-2xl border-2 border-zinc-200 shadow-sm">
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 rounded-2xl p-10 cursor-pointer hover:border-indigo-600 hover:bg-indigo-50/20 transition-all bg-zinc-50/50">
          <div className="p-4 rounded-2xl bg-indigo-100 text-indigo-700 mb-3 shadow-sm">
            <UploadCloud className="w-8 h-8" />
          </div>
          <span className="text-lg font-black text-black">
            {uploading ? `Ingesting video stream... ${progress}%` : 'Select or drag traffic surveillance footage here'}
          </span>
          <span className="text-xs font-semibold text-zinc-600 mt-1">
            Supported containers: <span className="text-indigo-600 font-extrabold font-mono">MP4, AVI, MOV, MKV</span> | File size ceiling: <span className="text-black font-extrabold">200 MB</span>
          </span>
          <input
            type="file"
            accept="video/mp4,video/x-msvideo,video/quicktime,video/x-matroska"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>

        {uploading && (
          <div className="mt-5 w-full bg-zinc-100 rounded-full h-3 overflow-hidden border border-zinc-200">
            <div
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 h-3 transition-all duration-200 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border-2 border-rose-300 text-xs text-rose-800 font-extrabold">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Video Catalog Table */}
      <div className="bg-white rounded-2xl border-2 border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4.5 border-b-2 border-zinc-200 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-800">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-black">Ingested Footage Library ({videos.length})</h2>
              <p className="text-xs font-semibold text-zinc-600">Surveillance assets ready for neural inference & ByteTrack analytics</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100 text-black font-extrabold uppercase text-[11px] border-b-2 border-zinc-300 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Filename</th>
                <th className="px-6 py-3.5">Resolution</th>
                <th className="px-6 py-3.5">Frame Rate</th>
                <th className="px-6 py-3.5">Total Frames</th>
                <th className="px-6 py-3.5">Duration</th>
                <th className="px-6 py-3.5">File Size</th>
                <th className="px-6 py-3.5">SHA-256 Hash</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-black">
              {videos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-zinc-600 font-bold">
                    No videos uploaded yet. Use the upload area above to ingest your first traffic surveillance video.
                  </td>
                </tr>
              ) : (
                videos.map((v) => (
                  <tr key={v.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="px-6 py-4 font-black text-black flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
                        <Video className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-extrabold">{v.original_filename}</span>
                    </td>
                    <td className="px-6 py-4 font-bold">
                      <span className="px-2.5 py-1 rounded-md bg-cyan-50 text-cyan-800 border-2 border-cyan-300 font-extrabold">
                        {v.width} &times; {v.height}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold">
                      <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border-2 border-blue-300 font-extrabold font-mono">
                        {v.fps.toFixed(1)} FPS
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold">
                      <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-800 border-2 border-purple-300 font-extrabold font-mono">
                        {v.total_frames}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-zinc-700">
                      <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border-2 border-amber-300 font-extrabold font-mono">
                        {v.duration_seconds.toFixed(1)}s
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-800 font-black font-mono">
                      {(v.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
                    </td>
                    <td className="px-6 py-4 font-mono text-zinc-500 text-[10px]" title={v.file_hash_sha256}>
                      <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200">
                        {v.file_hash_sha256.substring(0, 10)}...
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => onSelectVideoForAnalysis(v.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-black px-3.5 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/25"
                      >
                        <Play className="w-3.5 h-3.5 text-white" />
                        <span>Run Analysis</span>
                      </button>
                      <button
                        onClick={() => handleDelete(v.id, v.original_filename)}
                        className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-2 rounded-xl bg-rose-50 text-rose-700 border-2 border-rose-300 hover:bg-rose-100 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
