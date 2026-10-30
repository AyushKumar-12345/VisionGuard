import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Eye,
  Film,
  Play,
  Search,
  Trash2,
  UploadCloud,
  Video,
  X
} from 'lucide-react';
import { VideoItem } from '../types';
import { deleteVideo, resolveMediaUrl, uploadVideo } from '../api/client';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [previewVideo, setPreviewVideo] = useState<VideoItem | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

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
    if (!window.confirm(`Are you sure you want to delete "${filename}"? All associated jobs and analytics will be permanently removed.`)) {
      return;
    }
    try {
      await deleteVideo(videoId);
      onRefresh();
    } catch (err: any) {
      alert(`Error deleting video: ${err.message}`);
    }
  };

  const filteredVideos = videos.filter((v) =>
    v.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 bg-white text-black">
      {/* Header */}
      <div className="pb-6 border-b-2 border-zinc-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-300">
            Surveillance Media Repository
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-300">
            OpenCV Incremental Ingestion
          </span>
        </div>
        <h1 className="text-3xl font-black text-black tracking-tight">
          Video Ingestion & Stream Management
        </h1>
        <p className="text-sm font-semibold text-zinc-700 mt-1 max-w-3xl">
          Ingest, catalog, and inspect traffic surveillance footage. All files undergo byte-level binary signature validation, OpenCV keyframe decoding, and SHA-256 fingerprinting.
        </p>
      </div>

      {/* Upload Dropzone */}
      <div className="bg-white p-7 rounded-2xl border-2 border-zinc-200 shadow-sm">
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 rounded-2xl p-8 sm:p-10 cursor-pointer hover:border-indigo-600 hover:bg-indigo-50/20 transition-all bg-zinc-50/50">
          <div className="p-4 rounded-2xl bg-indigo-100 text-indigo-700 mb-3 shadow-sm">
            <UploadCloud className="w-8 h-8" />
          </div>
          <span className="text-base sm:text-lg font-black text-black text-center">
            {uploading ? `Ingesting video stream... ${progress}%` : 'Select or drag traffic surveillance footage here'}
          </span>
          <span className="text-xs font-semibold text-zinc-600 mt-1 text-center">
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

      {/* Video Catalog Table with Search Filter */}
      <div className="bg-white rounded-2xl border-2 border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4.5 border-b-2 border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-800">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-black">
                Ingested Footage Library ({filteredVideos.length})
              </h2>
              <p className="text-xs font-semibold text-zinc-600">Surveillance assets ready for neural inference & ByteTrack analytics</p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-bold pl-9 pr-3 py-2 rounded-xl bg-white border-2 border-zinc-200 text-black placeholder-zinc-400 focus:outline-none focus:border-indigo-600 shadow-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100 text-black font-extrabold uppercase text-[11px] border-b-2 border-zinc-300 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Footage File</th>
                <th className="px-6 py-3.5">Resolution</th>
                <th className="px-6 py-3.5">FPS</th>
                <th className="px-6 py-3.5">Total Frames</th>
                <th className="px-6 py-3.5">Duration</th>
                <th className="px-6 py-3.5">File Size</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-black">
              {filteredVideos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-600 font-bold">
                    {searchQuery ? `No videos match "${searchQuery}"` : 'No videos uploaded yet. Use the upload area above to ingest your first traffic surveillance video.'}
                  </td>
                </tr>
              ) : (
                filteredVideos.map((v) => (
                  <tr key={v.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="px-6 py-4 font-black text-black">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700 shrink-0">
                          <Video className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-sm font-extrabold block">{v.original_filename}</span>
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 font-normal mt-0.5">
                            <span>ID: {v.id.substring(0, 8)}...</span>
                            <span>&bull;</span>
                            <span className="flex items-center gap-1">
                              SHA: {v.file_hash_sha256.substring(0, 8)}...
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyHash(v.file_hash_sha256);
                                }}
                                className="p-0.5 hover:text-black transition-colors cursor-pointer"
                                title="Copy full SHA-256 fingerprint"
                              >
                                {copiedHash === v.file_hash_sha256 ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3 text-zinc-400 hover:text-zinc-700" />
                                )}
                              </button>
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold">
                      <span className="px-2.5 py-1 rounded-md bg-cyan-50 text-cyan-800 border-2 border-cyan-300 font-extrabold font-mono">
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
                        {v.total_frames} frames
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
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      {/* Preview Button */}
                      <button
                        onClick={() => setPreviewVideo(v)}
                        className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-2 rounded-xl bg-white border-2 border-zinc-200 text-black hover:border-indigo-600 hover:text-indigo-600 transition-all cursor-pointer shadow-xs"
                        title="Preview raw video stream"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Preview</span>
                      </button>

                      {/* Download Button */}
                      <a
                        href={resolveMediaUrl(v.preview_url || `/media/uploads/${v.id}.mp4`)}
                        download={v.original_filename}
                        className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-black transition-all cursor-pointer shadow-xs"
                        title="Download raw video file"
                      >
                        <Download className="w-3.5 h-3.5 text-zinc-700" />
                      </a>

                      {/* Run Analysis Button */}
                      <button
                        onClick={() => onSelectVideoForAnalysis(v.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-black px-3.5 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/25 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-white text-white" />
                        <span>Run Analysis</span>
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(v.id, v.original_filename)}
                        className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-2 rounded-xl bg-rose-50 text-rose-700 border-2 border-rose-300 hover:bg-rose-100 transition-all cursor-pointer"
                        title="Purge video and analytics"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Video Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-zinc-200 shadow-2xl max-w-2xl w-full p-6 text-black space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b-2 border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-black">{previewVideo.original_filename}</h3>
                  <p className="text-xs font-semibold text-zinc-600">
                    {previewVideo.width}&times;{previewVideo.height} &bull; {previewVideo.fps} FPS &bull; {previewVideo.total_frames} frames
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewVideo(null)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-black hover:bg-zinc-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Embedded Video Player */}
            <div className="rounded-2xl overflow-hidden bg-zinc-950 border-2 border-zinc-200 aspect-video flex items-center justify-center relative">
              <video
                key={previewVideo.id}
                controls
                autoPlay
                playsInline
                preload="auto"
                className="w-full h-full object-contain"
                src={resolveMediaUrl(previewVideo.preview_url || `/media/uploads/${previewVideo.id}.mp4`)}
              >
                Your browser does not support HTML5 video preview.
              </video>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-zinc-500">
                  Size: {(previewVideo.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
                </span>
                <a
                  href={resolveMediaUrl(previewVideo.preview_url || `/media/uploads/${previewVideo.id}.mp4`)}
                  download={previewVideo.original_filename}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1"
                >
                  Download Video File
                </a>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewVideo(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 text-black text-xs font-bold hover:bg-zinc-200 transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const id = previewVideo.id;
                    setPreviewVideo(null);
                    onSelectVideoForAnalysis(id);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-all cursor-pointer shadow-md shadow-indigo-600/25 flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Configure & Run Analysis</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
