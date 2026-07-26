"use client";

import { useEffect, useState } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { Shield, Activity, ShieldAlert, Cpu } from "lucide-react";

interface AgentProfile {
  agent_id: string;
  tool_distribution: Record<string, number>;
  avg_content_length_bytes: number;
  stddev_content_length_bytes: number;
  hourly_distribution: Record<string, number>;
  total_calls: number;
  is_stable: boolean;
  updated_at: string;
}

export default function AgentsDashboard() {
  const [profiles, setProfiles] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfiles() {
      try {
        const response = await fetch("/api/agents/profiles");
        if (!response.ok) {
          throw new Error("Failed to fetch agent profiles");
        }
        const data = await response.json();
        setProfiles(data.profiles || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProfiles();
  }, []);

  if (loading) {
    return <div className="p-8 text-white">Loading agent profiles...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2 flex items-center">
          <Cpu className="w-6 h-6 mr-2 text-blue-400" />
          Agent Behavioral Profiles
        </h1>
        <p className="text-gray-400">
          Monitor your AI agents for behavioral anomalies and compromised keys.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {profiles.length === 0 ? (
          <div className="text-gray-400">No stable agent profiles found yet. Profiles require at least 100 tool calls.</div>
        ) : (
          profiles.map((profile) => {
            // Compute radar data
            // To make it fit on a radar, we can normalize tool distribution to 100 max
            const toolData = Object.entries(profile.tool_distribution)
              .map(([name, val]) => ({
                subject: name,
                A: Math.round(val * 100),
                fullMark: 100,
              }))
              .slice(0, 5); // top 5 tools

            return (
              <div
                key={profile.agent_id}
                className="bg-gray-800 border border-gray-700 rounded-xl p-6 relative overflow-hidden"
              >
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-400 border border-green-800">
                    <Shield className="w-3 h-3 mr-1" /> Normal
                  </span>
                </div>
                
                <h2 className="text-lg font-semibold text-white mb-1">
                  {profile.agent_id}
                </h2>
                <p className="text-xs text-gray-400 mb-6">
                  {profile.total_calls} calls recorded • Last updated: {new Date(profile.updated_at).toLocaleDateString()}
                </p>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={toolData}>
                      <PolarGrid stroke="#374151" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        name="Usage %"
                        dataKey="A"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.5}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-400">Avg Content Len</div>
                    <div className="text-sm font-medium text-white">{Math.round(profile.avg_content_length_bytes)} bytes</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">StdDev Content Len</div>
                    <div className="text-sm font-medium text-white">{Math.round(profile.stddev_content_length_bytes)} bytes</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
