import { useEffect, useRef, useCallback, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config';

/**
 * Hook that manages a Socket.io connection.
 * - Connects to the server on mount.
 * - Joins the given season room so events are scoped to that season.
 * - Exposes `connected` state and a `reconnect()` helper.
 * - Returns `on()` to subscribe to events.
 * - Disconnects on unmount.
 */
export function useSocket(seasonId: number | null) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  // Stable connect logic extracted so reconnect() can reuse it
  const connectSocket = useCallback(() => {
    if (!seasonId) return;

    // Tear down existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
    }

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[socket] connected:', socket.id);
      setConnected(true);
      socket.emit('join-season', seasonId);
    });

    socket.on('disconnect', (reason) => {
      console.log('[socket] disconnected:', reason);
      setConnected(false);
    });

    socket.on('connect_error', () => {
      setConnected(false);
    });

    socketRef.current = socket;
  }, [seasonId]);

  // Connect on mount / when seasonId changes
  useEffect(() => {
    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
    };
  }, [connectSocket]);

  /** Force a reconnection attempt */
  const reconnect = useCallback(() => {
    connectSocket();
  }, [connectSocket]);

  /** Subscribe to a socket event. Returns an unsubscribe function. */
  const on = useCallback(<T = unknown>(event: string, handler: (data: T) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on(event, handler as (...args: unknown[]) => void);
    return () => {
      socket.off(event, handler as (...args: unknown[]) => void);
    };
  }, []);

  return { on, connected, reconnect, socketRef };
}
