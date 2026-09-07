import type { Socket } from 'socket.io-client';

import { io } from 'socket.io-client';
import { useState, useEffect } from 'react';

import { JWT_STORAGE_KEY } from 'src/pages/auth/context/jwt/constant';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? '';

// ----------------------------------------------------------------------

export type OrderLocationPayload = {
  orderId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  ts?: number;
};

type OrderLocationCallback = (location: { lat: number; lng: number }) => void;

const orderLocationSubscribers = new Map<string, OrderLocationCallback>();

function notifyOrderLocationSubscribers(data: OrderLocationPayload) {
  const key = String(data.orderId);
  const callback = orderLocationSubscribers.get(key);
  if (callback) {
    callback({ lat: data.lat, lng: data.lng });
  }
}

// ----------------------------------------------------------------------

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = sessionStorage.getItem(JWT_STORAGE_KEY);

    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Working — connected', { id: socket?.id, url: SOCKET_URL });
    });

    socket.on('order:location', (data: OrderLocationPayload) => {
      notifyOrderLocationSubscribers(data);
    });

    socket.on('order:joined', (data) => {
      console.log('order:joined:', data);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket] Not connected (disconnected)', { reason, url: SOCKET_URL });
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Not working — connection error', {
        message: err.message,
        url: SOCKET_URL,
      });
    });

    socket.on('reconnect_failed', () => {
      console.error('[Socket] Not working — reconnection failed after all attempts', {
        url: SOCKET_URL,
      });
    });
  }

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinOrderRoom(orderId: number): void {
  const s = getSocket();
  s.emit('order:join', { orderId });
}

export function leaveOrderRoom(orderId: number): void {
  const s = getSocket();
  s.emit('order:leave', { orderId });
}

// ----------------------------------------------------------------------

export function subscribeOrderLocation(
  orderId: number | string,
  callback: OrderLocationCallback
): () => void {
  const key = String(orderId);
  orderLocationSubscribers.set(key, callback);
  return () => {
    orderLocationSubscribers.delete(key);
  };
}

export function useOrderLocation(
  orderId: string | number | null
): { lat: number; lng: number } | null {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (orderId == null || orderId === '') return undefined;

    const unsubscribe = subscribeOrderLocation(orderId, (loc) => setLocation(loc));

    return unsubscribe;
  }, [orderId]);

  return location;
}
