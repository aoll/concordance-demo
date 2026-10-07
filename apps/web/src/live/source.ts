import { type ServerToClientEvents, ZONE_OCCUPANCY_UPDATED } from '@concordance/contracts';
import { io, type Socket } from 'socket.io-client';

export type LiveStatus = 'connecting' | 'live' | 'offline';

interface LiveHandlers {
  onEvent: (event: unknown) => void;
  onStatus: (status: LiveStatus, reconnected: boolean) => void;
}

/** Une seule socket par page, ouverte au premier abonnement et gardée ensuite (flux public). */
let shared: Socket<ServerToClientEvents> | undefined;
const sharedSocket = () => {
  shared ??= io({ transports: ['websocket'] });
  return shared;
};

/**
 * Source des événements temps réel : la gateway socket.io de l'API (même origine, proxifiée
 * par Vite en dev). Renvoie la fonction de désabonnement.
 * La socket survit aux désabonnements : le double montage de StrictMode ou un changement
 * d'écran ne coupent pas une connexion en cours d'établissement.
 */
export function subscribeLive({ onEvent, onStatus }: LiveHandlers): () => void {
  const socket = sharedSocket();
  const onConnect = () => onStatus('live', false);
  const onDown = () => onStatus('offline', false);
  // Reconnexion après une coupure : des événements ont pu être manqués.
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
