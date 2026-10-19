import React, { useState } from 'react';
import {
  Film,
  Play,
  Trash2,
  UploadCloud
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
    if (!window.confirm(`Are you sure you want to delete ${filename}? All associated jobs and annotated videos will be removed.`)) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-zinc-200">
        <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">
          Video Ingestion & Library
        </h1>
        <p className="text-sm text-zinc-600 mt-1">
          Upload and manage traffic surveillance footage. All files undergo binary signature inspection, incremental frame decoding, and metadata extraction.
        </p>
      </div>

      {/* Upload Dropzone */}
      <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 rounded-lg p-8 cursor-pointer hover:border-zinc-900 transition-all bg-zinc-50 hover:bg-zinc-100">
          <UploadCloud className="w-10 h-10 text-zinc-400 mb-3" />
          <span className="text-base font-semibold text-zinc-950">
            {uploading ? `Ingesting video file... ${progress}%` : 'Click to select or drag traffic footage here'}
          </span>
          <span className="text-xs text-zinc-500 mt-1">
            Supported formats: MP4, AVI, MOV, MKV | File size ceiling: 200 MB
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
          <div className="mt-4 w-full bg-zinc-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-zinc-950 h-2 transition-all duration-200 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}

        {errorMsg && (
          <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Video Catalog Table */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-zinc-900" />
            <h2 className="text-base font-bold text-zinc-950">Ingested Videos ({videos.length})</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200">
              <tr>
                <th className="px-6 py-3">Filename</th>
                <th className="px-6 py-3">Dimensions</th>
                <th className="px-6 py-3">FPS</th>
                <th className="px-6 py-3">Total Frames</th>
                <th className="px-6 py-3">Duration</th>
                <th className="px-6 py-3">Size</th>
                <th className="px-6 py-3">SHA-256 Hash</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-800">
              {videos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-zinc-500">
                    No videos uploaded yet. Use the upload area above to ingest your first traffic video.
                  </td>
                </tr>
              ) : (
                videos.map((v) => (
                  <tr key={v.id} className="hover:bg-zinc-50">
                    <td className="px-6 py-3.5 font-semibold text-zinc-950 flex items-center gap-2">
                      <Film className="w-4 h-4 text-zinc-400" />
                      <span>{v.original_filename}</span>
                    </td>
                    <td className="px-6 py-3.5 font-medium">
                      {v.width} &times; {v.height}
                    </td>
                    <td className="px-6 py-3.5 font-medium">
                      {v.fps.toFixed(1)} FPS
                    </td>
                    <td className="px-6 py-3.5 font-medium">
                      {v.total_frames}
                    </td>
                    <td className="px-6 py-3.5 text-zinc-600">
                      {v.duration_seconds.toFixed(1)}s
                    </td>
                    <td className="px-6 py-3.5 text-zinc-600">
                      {(v.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
                    </td>
                    <td className="px-6 py-3.5 font-mono text-zinc-500 text-[10px]" title={v.file_hash_sha256}>
                      {v.file_hash_sha256.substring(0, 10)}...
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => onSelectVideoForAnalysis(v.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-zinc-950 text-white hover:bg-zinc-800 transition-all shadow-sm"
                      >
                        <Play className="w-3 h-3" />
                        <span>Analyze</span>
                      </button>
                      <button
                        onClick={() => handleDelete(v.id, v.original_filename)}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
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
