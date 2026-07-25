import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export interface GraphNode {
  id: string;
  elementId: string;
  labels: string[];
  properties: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  elementId: string;
  type: string;
  startNode: string;
  endNode: string;
  properties: Record<string, any>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphResponse {
  success: boolean;
  graph: GraphData;
  timestamp: string;
}

export interface HealResponse {
  success: boolean;
  message: string;
  new_status: string;
}

export const useGraph = () => {
  const queryClient = useQueryClient();

  const query = useQuery<GraphResponse>({
    queryKey: ['graph'],
    queryFn: () => apiFetch<GraphResponse>('/api/graph'),
  });

  const healEdge = useMutation<HealResponse, Error, string>({
    mutationFn: (edgeElementId) => apiFetch<HealResponse>('/api/graph/heal', {
      method: 'POST',
      body: JSON.stringify({ edge_element_id: edgeElementId }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graph'] });
    },
  });

  return {
    ...query,
    healEdge,
  };
};
