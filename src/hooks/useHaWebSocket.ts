'use client';

import { useEffect, useRef, useState } from 'react';
import { resolveHaBrowserUrl } from '@/lib/haBrowserUrl';

export interface HaEntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

export type HaConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Home Assistant entity IDs are always `<domain>.<object_id>` made of lowercase
 * letters, digits and underscores. Anything else coming off the socket (e.g.
 * `__proto__`, `constructor`) is rejected so a malicious/compromised HA server
 * cannot use the entity_id as a property name to pollute object prototypes.
 */
const HA_ENTITY_ID = /^[a-z0-9_]+\.[a-z0-9_]+$/;

function isValidEntity(entity: unknown): entity is HaEntityState {
  return (
    typeof entity === 'object' &&
    entity !== null &&
    typeof (entity as HaEntityState).entity_id === 'string' &&
    HA_ENTITY_ID.test((entity as HaEntityState).entity_id)
  );
}

/**
 * Build the entity map without dynamic property writes (`acc[key] = ...`).
 * Object.fromEntries always defines *own* properties, so even an unexpected key
 * can never reach Object.prototype.
 */
function indexStates(entities: unknown[]): Record<string, HaEntityState> {
  return Object.fromEntries(
    entities.filter(isValidEntity).map((e) => [e.entity_id, e] as const)
  );
}

export interface UseHaWebSocketReturn {
  states: Record<string, HaEntityState>;
  status: HaConnectionStatus;
  error: string | null;
}

export function useHaWebSocket(): UseHaWebSocketReturn {
  const [states, setStates] = useState<Record<string, HaEntityState>>({});
  const [status, setStatus] = useState<HaConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const msgIdRef = useRef<number>(1);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;

    async function fetchConfigAndConnect() {
      let url: string | null = null;
      let token: string | null = null;

      try {
        const res = await fetch('/api/ha/config');
        if (res.ok) {
          const data = await res.json();
          url = data.url ?? null;
          token = data.token ?? null;
        }
      } catch {
        // config fetch failed — will stay disconnected / fall back to REST
      }

      // `ha_url` is stored for the server (usually http://localhost:8123). From
      // a phone that address points at the phone, so resolve it against the
      // host this page was actually served from.
      const browserUrl = resolveHaBrowserUrl(url, window.location);

      if (!browserUrl || !token) {
        // No config — try REST fallback once
        await fetchRestFallback();
        return;
      }

      connectWebSocket(browserUrl, token);
    }

    function connectWebSocket(haUrl: string, token: string) {
      if (!isMountedRef.current) return;

      const wsUrl = haUrl
        .replace(/^https:\/\//i, 'wss://')
        .replace(/^http:\/\//i, 'ws://')
        + '/api/websocket';

      setStatus('connecting');
      msgIdRef.current = 1;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Wait for auth_required from server — nothing to send yet
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!isMountedRef.current) return;

        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(event.data as string) as Record<string, unknown>;
        } catch {
          return;
        }

        const type = msg.type as string;

        if (type === 'auth_required') {
          ws.send(JSON.stringify({ type: 'auth', access_token: token }));
          return;
        }

        if (type === 'auth_ok') {
          setStatus('connected');
          setError(null);
          // Request full state snapshot
          ws.send(JSON.stringify({ id: 1, type: 'get_states' }));
          // Subscribe to state_changed events
          ws.send(JSON.stringify({ id: 2, type: 'subscribe_events', event_type: 'state_changed' }));
          msgIdRef.current = 3;
          return;
        }

        if (type === 'auth_invalid') {
          setStatus('error');
          setError('Authentication failed');
          ws.close();
          return;
        }

        if (type === 'result') {
          const id = msg.id as number;
          if (id === 1 && msg.success === true) {
            const resultArr = msg.result as HaEntityState[];
            if (Array.isArray(resultArr)) {
              setStates(
                indexStates(resultArr)
              );
            }
          }
          return;
        }

        if (type === 'event') {
          const id = msg.id as number;
          if (id === 2) {
            const ev = msg.event as Record<string, unknown> | undefined;
            if (ev?.event_type === 'state_changed') {
              const data = ev.data as Record<string, unknown> | undefined;
              const newState = data?.new_state as HaEntityState | null | undefined;
              if (isValidEntity(newState)) {
                setStates((prev) => indexStates([...Object.values(prev), newState]));
              }
            }
          }
          return;
        }
      };

      ws.onerror = () => {
        // onclose will fire after onerror; handle reconnect there
      };

      ws.onclose = (event: CloseEvent) => {
        if (!isMountedRef.current) return;

        // If we were in error state (auth_invalid), don't reconnect
        // We check if status was already set to error by checking the close reason indirectly:
        // auth_invalid closes after setting status to 'error'
        setStatus((prev) => {
          if (prev === 'error') return prev;
          // Unexpected close — schedule reconnect
          reconnectTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              connectWebSocket(haUrl, token);
            }
          }, 5000);
          return 'disconnected';
        });

        // Fallback to REST if we never got a connected state (i.e., WS failed to establish)
        // We check states length as a proxy — if empty, try REST
        setStates((prevStates) => {
          if (Object.keys(prevStates).length === 0 && event.type === 'close') {
            // Fire-and-forget REST fallback
            fetchRestFallback();
          }
          return prevStates;
        });
      };
    }

    async function fetchRestFallback() {
      if (!isMountedRef.current) return;
      try {
        const res = await fetch('/api/ha/states');
        if (res.ok) {
          const data = await res.json();
          const statesArr = data.states as HaEntityState[] | undefined;
          if (Array.isArray(statesArr) && isMountedRef.current) {
            setStates(
              indexStates(statesArr)
            );
          }
        }
      } catch {
        // REST also failed — leave states empty
      }
    }

    fetchConfigAndConnect();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return { states, status, error };
}
