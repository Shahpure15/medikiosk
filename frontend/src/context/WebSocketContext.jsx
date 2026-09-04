import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const { staffToken, staffUser } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [caseReadyEvent, setCaseReadyEvent] = useState(null);
  const [yourTurnEvent, setYourTurnEvent] = useState(null);

  const wsRef = useRef(null);
  const subscribedCaseIdRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  const connectWebSocket = () => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Connect to port 5000 or current host
      const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? `${window.location.hostname}:5000` 
        : window.location.host;

      let wsUrl = `${protocol}//${host}/ws`;
      if (staffToken) {
        wsUrl += `?token=${encodeURIComponent(staffToken)}`;
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // console.log('[WebSocket] Connected to', wsUrl);

        if (staffUser?.hospital_id) {
          ws.send(JSON.stringify({ action: 'subscribe_hospital', hospital_id: staffUser.hospital_id }));
        }
        if (subscribedCaseIdRef.current) {
          ws.send(JSON.stringify({ action: 'subscribe_case', case_id: subscribedCaseIdRef.current }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);

          if (data.event === 'case_ready') {
            setCaseReadyEvent(data);
          }
          if (data.event === 'your_turn') {
            setYourTurnEvent(data);
          }
        } catch (e) {}
      };

      ws.onerror = () => {
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Auto-reconnect after 3 seconds
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };
    } catch (err) {
      console.log('[WebSocket Init error]', err.message);
    }
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [staffToken, staffUser?.hospital_id]);

  const subscribeToCase = (caseId) => {
    subscribedCaseIdRef.current = caseId;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'subscribe_case', case_id: caseId }));
    }
  };

  return (
    <WebSocketContext.Provider value={{
      isConnected,
      lastMessage,
      caseReadyEvent,
      yourTurnEvent,
      subscribeToCase
    }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = () => useContext(WebSocketContext);
