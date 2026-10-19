import React, { useEffect, useState } from 'react';
import {
  Layers,
  Loader2,
  Play,
  Scale,
  Sparkles
} from 'lucide-react';
import { EvaluationRun } from '../types';
import { getEvaluationRuns, getModelComparison, runEvaluation } from '../api/client';

export const ModelComparisonPage: React.FC = () => {
  const [runs, setRuns] = useState<EvaluationRun[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [evaluatingModel, setEvaluatingModel] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [comparisonSummary, setComparisonSummary] = useState<string | null>(null);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const data = await getEvaluationRuns();
      setRuns(data);
      if (data.length > 0) {
        const comp = await getModelComparison();
        setComparisonSummary(comp.summary_analysis);
      }
    } catch (err: any) {
      console.error('Failed to load evaluation runs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleRunEvaluation = async (modelName: string) => {
    setEvaluatingModel(modelName);
    setErrorMsg(null);
    try {
      await runEvaluation(modelName);
      await fetchRuns();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || `Failed to evaluate ${modelName}`);
    } finally {
      setEvaluatingModel(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-2 border-b border-zinc-200">
        <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">
          Multi-Model Scientific Benchmark & Evaluation
        </h1>
        <p className="text-sm text-zinc-600 mt-1">
          Rigorous, reproducible comparison of compatible object detection architectures on the verified Traffic Ground-Truth Benchmark.
        </p>
      </div>

      {/* Action Banner to Run Live Benchmark */}
      <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-zinc-950" />
            <h2 className="text-base font-bold text-zinc-950">Execute Benchmark Run</h2>
          </div>
          <p className="text-xs text-zinc-600 mt-1">
            Trigger real-time evaluation against ground-truth annotations. Computes IoU matching, mAP@0.5, and CPU inference latency.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleRunEvaluation('yolov8n')}
            disabled={evaluatingModel !== null}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-sm"
          >
            {evaluatingModel === 'yolov8n' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Evaluating YOLOv8n...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Benchmark YOLOv8n (Nano)</span>
              </>
            )}
          </button>

          <button
            onClick={() => handleRunEvaluation('yolov8s')}
            disabled={evaluatingModel !== null}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-900 text-xs font-semibold hover:bg-zinc-50 disabled:opacity-50 transition-all shadow-sm"
          >
            {evaluatingModel === 'yolov8s' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Evaluating YOLOv8s...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Benchmark YOLOv8s (Small)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
          {errorMsg}
        </div>
      )}

      {/* Synthesis Insight Card */}
      {comparisonSummary && (
        <div className="p-5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-zinc-950" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-950">Technical Synthesis</h3>
          </div>
          <p className="text-xs text-zinc-700 leading-relaxed font-medium">
            {comparisonSummary}
          </p>
        </div>
      )}

      {/* Model Benchmark Comparative Table */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-zinc-950" />
            <h2 className="text-base font-bold text-zinc-950">Model Comparison Matrix (Pareto Frontier)</h2>
          </div>
          <span className="text-xs text-zinc-500 font-mono">Dataset: COCO Traffic MiniVal</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200">
              <tr>
                <th className="px-6 py-3">Model</th>
                <th className="px-6 py-3">Precision</th>
                <th className="px-6 py-3">Recall</th>
                <th className="px-6 py-3">F1 Score</th>
                <th className="px-6 py-3">mAP@0.5</th>
                <th className="px-6 py-3">mAP@0.5:0.95</th>
                <th className="px-6 py-3">Latency (ms)</th>
                <th className="px-6 py-3">Throughput (FPS)</th>
                <th className="px-6 py-3">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-zinc-400">
                    Loading benchmark records...
                  </td>
                </tr>
              ) : runs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-zinc-500">
                    No benchmark runs recorded yet. Click the <b>Benchmark YOLOv8n</b> or <b>Benchmark YOLOv8s</b> buttons above to run real evaluations.
                  </td>
                </tr>
              ) : (
                runs.map((run) => (
                  <tr key={run.id} className="hover:bg-zinc-50">
                    <td className="px-6 py-3.5 font-bold text-zinc-950">
                      {run.model_name || 'yolov8n'}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-zinc-900">
                      {run.precision !== undefined && run.precision !== null ? (run.precision * 100).toFixed(1) + '%' : '—'}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-zinc-900">
                      {run.recall !== undefined && run.recall !== null ? (run.recall * 100).toFixed(1) + '%' : '—'}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-zinc-900">
                      {run.f1_score !== undefined && run.f1_score !== null ? (run.f1_score * 100).toFixed(1) + '%' : '—'}
                    </td>
                    <td className="px-6 py-3.5 font-extrabold text-emerald-700">
                      {run.map50 !== undefined && run.map50 !== null ? (run.map50 * 100).toFixed(1) + '%' : '—'}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-zinc-600">
                      {run.map50_95 !== undefined && run.map50_95 !== null ? (run.map50_95 * 100).toFixed(1) + '%' : '—'}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-zinc-900 font-semibold">
                      {run.latency_ms !== undefined && run.latency_ms !== null ? `${run.latency_ms.toFixed(1)} ms` : '—'}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-zinc-950">
                      {run.throughput_fps !== undefined && run.throughput_fps !== null ? `${run.throughput_fps.toFixed(1)} FPS` : '—'}
                    </td>
                    <td className="px-6 py-3.5 text-zinc-600 capitalize">
                      {run.device}
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
