import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export interface AuditLog {
  id: string;
  created_at: string;
  tenant_id: string;
  event_type: string;
  event_ref: string;
  prev_hash: string;
  this_hash: string;
}

export interface AuditLogsResponse {
  success: boolean;
  isDbConnected: boolean;
  totalLogs: number;
  logs: AuditLog[];
  timestamp: string;
}

export const useAuditLogs = () => {
  return useQuery<AuditLogsResponse>({
    queryKey: ['audit-logs'],
    queryFn: () => apiFetch<AuditLogsResponse>('/api/audit-logs'),
    refetchInterval: 15000,
  });
};
