import { useEffect, useState } from 'react';
import { getWsStatus, WsStatus, WS_EVENT, WS_STATUS_EVENT, GraphUpdatePayload } from '../lib/ws';
import { useQueryClient } from '@tanstack/react-query';

export const useWebSocket = () => {
  const [status, setStatus] = useState<WsStatus>(getWsStatus());
  const [lastEvent, setLastEvent] = useState<GraphUpdatePayload | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleStatus = (e: CustomEvent<WsStatus>) => setStatus(e.detail);
    const handleEvent = (e: CustomEvent<GraphUpdatePayload>) => {
      setLastEvent(e.detail);
      // Invalidate relevant queries when graph updates occur
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['graph'] });
    };

    window.addEventListener(WS_STATUS_EVENT, handleStatus as EventListener);
    window.addEventListener(WS_EVENT, handleEvent as EventListener);

    return () => {
      window.removeEventListener(WS_STATUS_EVENT, handleStatus as EventListener);
      window.removeEventListener(WS_EVENT, handleEvent as EventListener);
    };
  }, [queryClient]);

  return { status, lastEvent };
};
