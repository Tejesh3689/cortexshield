import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export interface OverviewMetrics {
  shieldedRequests: string;
  shieldedRequestsGrowth: string;
  blockedThreats: string;
  highSeverityInjections: number;
  memoryIntegrity: string;
  nodesSynced: string;
  enforcedPolicies: string;
  activeRulesText: string;
  latencyMs: string;
}

export interface LiveLog {
  status: string;
  type: string;
  ip: string;
  rule: string;
  time: string;
  color: string;
}

export interface ThreatVector {
  label: string;
  pct: number;
  color: string;
  textColor: string;
}

export interface ChartDataPoint {
  time: string;
  val: number;
  threat: boolean;
}

export interface OverviewResponse {
  success: boolean;
  isDbConnected: boolean;
  dbSource: string;
  timeframe: string;
  metrics: OverviewMetrics;
  chartData: ChartDataPoint[];
  liveLogs: LiveLog[];
  threatVectors: ThreatVector[];
  timestamp: string;
}

export const useOverview = (timeframe = '24h') => {
  return useQuery<OverviewResponse>({
    queryKey: ['overview', timeframe],
    queryFn: () => apiFetch<OverviewResponse>(`/api/overview?timeframe=${timeframe}`),
    refetchInterval: 30000,
  });
};
