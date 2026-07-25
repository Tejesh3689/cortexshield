import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export interface ApiKey {
  id: string;
  tenant_id: string;
  key_prefix: string;
  created_at: string;
  revoked_at: string | null;
  status: 'Active' | 'Revoked';
}

export interface ApiKeyListResponse {
  success: boolean;
  tenant_id: string;
  api_keys: ApiKey[];
}

export interface CreateApiKeyResponse {
  success: boolean;
  message: string;
  api_key: {
    id: string;
    name: string;
    raw_key: string;
    key_prefix: string;
    created_at: string;
    status: 'Active';
  };
}

export const useApiKeys = () => {
  const queryClient = useQueryClient();

  const query = useQuery<ApiKeyListResponse>({
    queryKey: ['api-keys'],
    queryFn: () => apiFetch<ApiKeyListResponse>('/api/api-keys'),
  });

  const createKey = useMutation<CreateApiKeyResponse, Error, string>({
    mutationFn: (name) => apiFetch<CreateApiKeyResponse>('/api/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  const revokeKey = useMutation<{ success: boolean }, Error, string>({
    mutationFn: (id) => apiFetch<{ success: boolean }>(`/api/api-keys?id=${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  return {
    ...query,
    createKey,
    revokeKey,
  };
};
