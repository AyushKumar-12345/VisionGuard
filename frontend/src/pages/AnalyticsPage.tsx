import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart2,
  Car,
  PieChart as PieIcon
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { ClassDistributionItem } from '../types';
import { getClassDistribution } from '../api/client';

const COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export const AnalyticsPage: React.FC = () => {
  const [distribution, setDistribution] = useState<ClassDistributionItem[]>([]);
  const [totalVehicles, setTotalVehicles] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getClassDistribution();
        setDistribution(data.distribution);
        setTotalVehicles(data.total);
      } catch (err) {
        console.error('Failed to load class distribution', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-2 border-b border-zinc-200">
        <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">
          Traffic Analytics & Spatial Volume
        </h1>
        <p className="text-sm text-zinc-600 mt-1">
          Aggregated vehicle taxonomy, class volume distribution, and directional movement breakdown across tracked sessions.
        </p>
      </div>

      {/* Camera Calibration Disclaimer Alert */}
      <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-zinc-700 leading-relaxed">
          <span className="font-bold text-zinc-950">Technical Accuracy & Speed Calibration Notice: </span>
          Monocular surveillance cameras suffer from projective distortion and lack physical ground-plane depth.
          VisionGuard strictly avoids fabricating arbitrary speed estimates (km/h) unless calibrated with 4-point homography matrix mapping against physical road markers.
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Breakdown Bar Chart */}
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-zinc-900" />
            <h2 className="text-base font-bold text-zinc-950">Vehicle Volume by Class</h2>
          </div>
          <div className="h-72 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                Loading analytics data...
              </div>
            ) : distribution.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                No tracked vehicles recorded yet. Run a video analysis to see analytics.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="class_name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#0f172a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Class Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-zinc-900" />
            <h2 className="text-base font-bold text-zinc-950">Vehicle Class Share (%)</h2>
          </div>
          <div className="h-72 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                Loading share data...
              </div>
            ) : distribution.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                No class data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribution}
                    dataKey="count"
                    nameKey="class_name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ class_name, percentage }) => `${class_name} (${percentage}%)`}
                    labelLine={false}
                  >
                    {distribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Class Statistics Table */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-950">Detailed Class Breakdown Summary</h2>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-zinc-100 text-zinc-800">
            {totalVehicles.toLocaleString()} Total Unique Vehicles
          </span>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200">
            <tr>
              <th className="px-6 py-3">Vehicle Class</th>
              <th className="px-6 py-3">Tracked Count</th>
              <th className="px-6 py-3">Percentage Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 text-zinc-800">
            {distribution.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-6 text-center text-zinc-500">
                  No data available yet.
                </td>
              </tr>
            ) : (
              distribution.map((item) => (
                <tr key={item.class_name} className="hover:bg-zinc-50">
                  <td className="px-6 py-3 font-semibold text-zinc-950 capitalize flex items-center gap-2">
                    <Car className="w-4 h-4 text-zinc-400" />
                    <span>{item.class_name}</span>
                  </td>
                  <td className="px-6 py-3 font-medium">{item.count.toLocaleString()}</td>
                  <td className="px-6 py-3 font-medium">{item.percentage}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
