import { useState, useEffect, useRef, useCallback } from "react";
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

// Define the types for the hook input and return values
type UseSocketConnectionStatus = {
  isConnected: boolean;
};

const useSocketConnectionStatus = (): UseSocketConnectionStatus => {
  const [isConnected, setIsConnected] = useState<boolean>(false); // state to track connection status
  const stompClientRef = useRef<Client | null>(null); // reference for STOMP client, initially null

  const SOCKET_URL = process.env.NEXT_PUBLIC_BASE_URL + "/ws";

  // Initialize the WebSocket connection using SockJS and STOMP
  const connectWebSocket = useCallback(() => {
    // Create a new SockJS connection
    const socket = new SockJS(SOCKET_URL);

    // Set up the STOMP client with SockJS
    stompClientRef.current = new Client({
      brokerURL: SOCKET_URL, // STOMP broker URL
      connectHeaders: {
        // Add any headers you need, such as authorization tokens
      },
      debug: (str: string) => {
        console.log(str); // Debug logs for STOMP
      },
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
      // More options can be added here, like onWebSocketError, onReconnected, etc.
      webSocketFactory: () => socket, // Use the SockJS connection
    });

    stompClientRef.current.activate(); // Start the connection
  }, [SOCKET_URL]);

  // Clean up connection on component unmount or when URL changes
  useEffect(() => {
    connectWebSocket();

    return () => {
      // Ensure clean-up of any previous connection
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
    };
  }, [connectWebSocket]);

  return { isConnected };
};

export default useSocketConnectionStatus;
