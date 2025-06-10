import { useState, useEffect, useRef, useCallback } from "react";
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

type UseSocketConnectionStatus = {
  isConnected: boolean;
};

const SOCKET_URL = `${process.env.NEXT_PUBLIC_FRONTEND_URL}${process.env.NEXT_PUBLIC_WS_PATH}`;

const isWithinTradingHours = (): boolean => {
  const now = new Date();
  const day = now.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6

  if (day === 0 || day === 6) return false;

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  const start = 9 * 60 + 30;  // 9:30 AM = 570
  const end = 15 * 60 + 30;   // 3:30 PM = 930

  return totalMinutes >= start && totalMinutes <= end;
};

const useSocketConnectionStatus = (): UseSocketConnectionStatus => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const stompClientRef = useRef<Client | null>(null);

  const connectWebSocket = useCallback(() => {
    if (!isWithinTradingHours()) {
      console.log("Outside trading hours — WebSocket not connected.");
      return;
    }

    const socket = new SockJS(SOCKET_URL);

    stompClientRef.current = new Client({
      brokerURL: undefined, // use webSocketFactory with SockJS
      webSocketFactory: () => socket,
      debug: (str: string) => console.log(str),
      connectHeaders: {},
      onConnect: () => {
        console.log("Connected to WebSocket server");
        setIsConnected(true);
      },
      onDisconnect: () => {
        console.log("Disconnected from WebSocket server");
        setIsConnected(false);
      },
      onStompError: (frame: any) => {
        console.error("STOMP error:", frame);
        setIsConnected(false);
      },
    });

    stompClientRef.current.activate();
  }, []);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
    };
  }, [connectWebSocket]);

  return { isConnected };
};

export default useSocketConnectionStatus;
