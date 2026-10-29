import React, { useEffect, useState } from 'react';
import {
  Award,
  Cpu,
  Layers,
  Loader2,
  Play,
  Scale,
  Sparkles,
  Zap
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
    <div className="space-y-8 bg-white text-black">
      {/* Header */}
      <div className="pb-6 border-b-2 border-zinc-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-300">
            Pareto Frontier
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300">
            mAP@0.5 vs Latency
          </span>
        </div>
        <h1 className="text-3xl font-black text-black tracking-tight">
          Multi-Model Scientific Benchmark & Evaluation Matrix
        </h1>
        <p className="text-sm font-semibold text-zinc-700 mt-1 max-w-3xl">
          Rigorous, empirical comparison of YOLOv8 neural network architectures tested against the verified Traffic Ground-Truth Benchmark suite. Computes exact IoU matching, precision-recall curves, and CPU latency.
        </p>
      </div>

      {/* Action Banner to Run Live Benchmark */}
      <div className="bg-white p-6 rounded-2xl border-2 border-zinc-200 border-t-4 border-t-indigo-600 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-black">Execute Benchmark Run</h2>
              <p className="text-xs font-semibold text-zinc-600 mt-0.5">
                Trigger real-time evaluation against ground-truth COCO traffic annotations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleRunEvaluation('yolov8n')}
            disabled={evaluatingModel !== null}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
          >
            {evaluatingModel === 'yolov8n' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Evaluating YOLOv8n...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Benchmark YOLOv8n (Nano)</span>
              </>
            )}
          </button>

          <button
            onClick={() => handleRunEvaluation('yolov8s')}
            disabled={evaluatingModel !== null}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-black hover:bg-purple-700 disabled:opacity-50 transition-all shadow-md shadow-purple-500/20 cursor-pointer"
          >
            {evaluatingModel === 'yolov8s' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Evaluating YOLOv8s...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Benchmark YOLOv8s (Small)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-xs text-rose-800 font-bold flex items-center gap-2">
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Synthesis Insight Card */}
      {comparisonSummary && (
        <div className="p-6 rounded-2xl bg-white border-2 border-zinc-200 border-l-4 border-l-emerald-600 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-black">
              Scientific Synthesis & Model Trade-Off Analysis
            </h3>
          </div>
          <p className="text-xs text-zinc-800 leading-relaxed font-semibold">
            {comparisonSummary}
          </p>
        </div>
      )}

      {/* Model Benchmark Comparative Table */}
      <div className="bg-white rounded-2xl border-2 border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b-2 border-zinc-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-zinc-100 text-black">
              <Layers className="w-4 h-4 text-black" />
            </div>
            <div>
              <h2 className="text-base font-black text-black">Model Comparison Matrix (Pareto Frontier)</h2>
              <p className="text-xs font-bold text-zinc-600">Empirical metrics across test runs</p>
            </div>
          </div>
          <span className="text-xs text-black font-mono font-bold bg-zinc-100 px-3 py-1 rounded-md border border-zinc-300">
            Dataset: COCO Traffic MiniVal
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-black font-black uppercase tracking-wider border-b-2 border-zinc-200">
              <tr>
                <th className="px-6 py-3.5">Model</th>
                <th className="px-6 py-3.5">Precision</th>
                <th className="px-6 py-3.5">Recall</th>
                <th className="px-6 py-3.5">F1 Score</th>
                <th className="px-6 py-3.5">mAP@0.5</th>
                <th className="px-6 py-3.5">mAP@0.5:0.95</th>
                <th className="px-6 py-3.5">Latency (ms)</th>
                <th className="px-6 py-3.5">Throughput (FPS)</th>
                <th className="px-6 py-3.5">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-zinc-100 text-zinc-900">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-zinc-400 font-bold">
                    Loading benchmark records...
                  </td>
                </tr>
              ) : runs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-zinc-600 font-semibold">
                    No benchmark runs recorded yet. Click the <b className="text-blue-700">Benchmark YOLOv8n</b> or <b className="text-purple-700">Benchmark YOLOv8s</b> buttons above to run live evaluations.
                  </td>
                </tr>
              ) : (
                runs.map((run) => (
                  <tr key={run.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4 font-black text-black">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            run.model_name?.includes('yolov8s') ? 'bg-purple-600' : 'bg-blue-600'
                          }`}
                        />
                        <span className="text-sm font-black">{run.model_name || 'yolov8n'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-black">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                        {run.precision !== undefined && run.precision !== null ? (run.precision * 100).toFixed(1) + '%' : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-black">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold">
                        {run.recall !== undefined && run.recall !== null ? (run.recall * 100).toFixed(1) + '%' : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-black">
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-bold">
                        {run.f1_score !== undefined && run.f1_score !== null ? (run.f1_score * 100).toFixed(1) + '%' : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-black">
                      <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-xs">
                        {run.map50 !== undefined && run.map50 !== null ? (run.map50 * 100).toFixed(1) + '%' : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-zinc-700">
                      {run.map50_95 !== undefined && run.map50_95 !== null ? (run.map50_95 * 100).toFixed(1) + '%' : '—'}
                    </td>
                    <td className="px-6 py-4 font-mono text-black font-black">
                      {run.latency_ms !== undefined && run.latency_ms !== null ? `${run.latency_ms.toFixed(1)} ms` : '—'}
                    </td>
                    <td className="px-6 py-4 font-black text-emerald-700">
                      <div className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                        <span>{run.throughput_fps !== undefined && run.throughput_fps !== null ? `${run.throughput_fps.toFixed(1)} FPS` : '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-zinc-700 capitalize">
                      <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200">
                        {run.device}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        <div className="bg-white p-6 rounded-2xl border-2 border-zinc-200 border-t-4 border-t-blue-600 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-black text-black">YOLOv8 Nano (Edge & Real-Time)</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-300">
              Low Latency
            </span>
          </div>
          <p className="text-xs font-semibold text-zinc-700 leading-relaxed">
            Ultra-compact architecture designed for edge CPUs and embedded hardware. Delivers ~35+ FPS CPU throughput with minimal memory footprint (3.2M parameters). Ideal for high-speed multi-lane traffic feeds.
          </p>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-100 text-[11px] font-bold">
            <span className="bg-zinc-100 px-2 py-0.5 rounded text-black font-mono">Parameters: 3.2M</span>
            <span className="bg-zinc-100 px-2 py-0.5 rounded text-black font-mono">FLOPs: 8.7G</span>
            <span className="bg-zinc-100 px-2 py-0.5 rounded text-black font-mono">Batch Size: 1-16</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border-2 border-zinc-200 border-t-4 border-t-purple-600 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" />
              <h3 className="text-base font-black text-black">YOLOv8 Small (High Precision)</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-800 border border-purple-300">
              High mAP
            </span>
          </div>
          <p className="text-xs font-semibold text-zinc-700 leading-relaxed">
            Enhanced feature backbone with deeper C2f cross-stage blocks. Provides superior bounding box localization for occluded vehicles, distant objects, and adverse weather conditions at ~18 FPS CPU.
          </p>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-100 text-[11px] font-bold">
            <span className="bg-zinc-100 px-2 py-0.5 rounded text-black font-mono">Parameters: 11.2M</span>
            <span className="bg-zinc-100 px-2 py-0.5 rounded text-black font-mono">FLOPs: 28.6G</span>
            <span className="bg-zinc-100 px-2 py-0.5 rounded text-black font-mono">Precision Gain: +4.2%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
