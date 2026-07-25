/**
 * lib/ws.ts — WebSocket manager for the CortexShield realtime gateway.
 *
 * Connects to ws://localhost:8200/ws/graph?api_key=<key>
 * Features:
 *   - Auto-reconnect with exponential back-off (max 30s)
 *   - 30s ping keepalive (server expects it)
 *   - Dispatches "cs:graph-update" CustomEvent on every server message
 *   - Singleton: only one connection per tab
 */

import { REALTIME_GW_URL, STORAGE_KEYS } from './api';

export type WsStatus = 'connecting' | 'open' | 'closed' | 'error';

export type GraphUpdatePayload = {
  tenant_id: string;
  event: string;
  data?: Record<string, unknown>;
};

export const WS_EVENT = 'cs:graph-update' as const;
export const WS_STATUS_EVENT = 'cs:ws-status' as const;

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let backoffMs = 1000;
let intentionallyClosed = false;

function emitStatus(status: WsStatus) {
  window.dispatchEvent(
    new CustomEvent<WsStatus>(WS_STATUS_EVENT, { detail: status }),
  );
}

function clearTimers() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (pingTimer) clearInterval(pingTimer);
  reconnectTimer = null;
  pingTimer = null;
}

function startPing() {
  pingTimer = setInterval(() => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'ping' }));
    }
  }, 30_000);
}

export function connectWebSocket(): void {
  const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY) ?? '';
  if (!apiKey) return; // no key → don't connect

  intentionallyClosed = false;
  if (socket && socket.readyState <= WebSocket.OPEN) return; // already open/connecting

  const url = `${REALTIME_GW_URL}/ws/graph?api_key=${encodeURIComponent(apiKey)}`;
  emitStatus('connecting');

  try {
    socket = new WebSocket(url);
  } catch {
    scheduleReconnect();
    return;
  }

  socket.onopen = () => {
    backoffMs = 1000;
    emitStatus('open');
    startPing();
  };

  socket.onmessage = (ev) => {
    try {
      const payload: GraphUpdatePayload = JSON.parse(ev.data as string);
      window.dispatchEvent(
        new CustomEvent<GraphUpdatePayload>(WS_EVENT, { detail: payload }),
      );
    } catch { /* ignore malformed frames */ }
  };

  socket.onerror = () => {
    emitStatus('error');
  };

  socket.onclose = (ev) => {
    clearTimers();
    emitStatus('closed');
    if (!intentionallyClosed && ev.code !== 4001) {
      // 4001 = auth rejected by gateway → don't reconnect
      scheduleReconnect();
    }
  };
}

function scheduleReconnect() {
  reconnectTimer = setTimeout(() => {
    backoffMs = Math.min(backoffMs * 2, 30_000);
    connectWebSocket();
  }, backoffMs);
}

export function disconnectWebSocket(): void {
  intentionallyClosed = true;
  clearTimers();
  socket?.close();
  socket = null;
}

export function getWsStatus(): WsStatus {
  if (!socket) return 'closed';
  switch (socket.readyState) {
    case WebSocket.CONNECTING: return 'connecting';
    case WebSocket.OPEN: return 'open';
    default: return 'closed';
  }
}
