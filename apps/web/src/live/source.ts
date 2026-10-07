import { type ServerToClientEvents, ZONE_OCCUPANCY_UPDATED } from '@concordance/contracts';
import { io, type Socket } from 'socket.io-client';

export type LiveStatus = 'connecting' | 'live' | 'offline';

interface LiveHandlers {
  onEvent: (event: unknown) => void;
  onStatus: (status: LiveStatus, reconnected: boolean) => void;
}

/** A single socket per page, opened on the first subscription and kept afterwards (public stream). */
let shared: Socket<ServerToClientEvents> | undefined;
const sharedSocket = () => {
  shared ??= io({ transports: ['websocket'] });
  return shared;
};

/**
 * Source of real-time events: the API's socket.io gateway (same origin, proxied
 * by Vite in dev). Returns the unsubscribe function.
 * The socket outlives unsubscriptions: StrictMode's double mount or a screen change
 * does not cut a connection that is still being established.
 */
export function subscribeLive({ onEvent, onStatus }: LiveHandlers): () => void {
  const socket = sharedSocket();
  const onConnect = () => onStatus('live', false);
  const onDown = () => onStatus('offline', false);
  // Reconnection after a disconnection: events may have been missed.
  const onReconnect = () => onStatus('live', true);
  onStatus(socket.connected ? 'live' : 'connecting', false);
  socket.on('connect', onConnect);
  socket.on('disconnect', onDown);
  socket.on('connect_error', onDown);
  socket.io.on('reconnect', onReconnect);
  socket.on(ZONE_OCCUPANCY_UPDATED, onEvent);
  return () => {
    socket.off('connect', onConnect);
    socket.off('disconnect', onDown);
    socket.off('connect_error', onDown);
    socket.io.off('reconnect', onReconnect);
    socket.off(ZONE_OCCUPANCY_UPDATED, onEvent);
  };
}
