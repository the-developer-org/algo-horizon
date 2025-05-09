import { useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';

import { useState, useCallback } from "react";
import { Client, IMessage } from '@stomp/stompjs';

import { WebSocketData } from './types/historical-insights'; // Adjust the import path as necessary


// Define the Candle type (adjust the properties to match the actual Candle structure)

const SOCKET_URL = process.env.NEXT_PUBLIC_BASE_URL + "/ws";

const useWebSocket = () => {
  const [data, setData] = useState<WebSocketData>({});
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(SOCKET_URL),
      onConnect: () => {
        console.log('Connected to WebSocket');

        // Subscribe to the WebSocket topic
        client.subscribe('/topic/data', (message: IMessage) => {
          try {
            // Parse the received message as a Map of instrument keys to Candle data
            const newData: WebSocketData = JSON.parse(message.body);
            console.log('Received:', newData);

            // Update the state with the new data
            setData((prevData) => ({
              ...prevData,
              ...newData, // Merge new data into the previous state
            }));
          } catch (error) {
            console.error('Failed to parse WebSocket message', error);
          }
        });
      },
      onDisconnect: () => {
        console.log('Disconnected from WebSocket');
      },
      debug: (str: string) => {
        console.log(str);
      },
      reconnectDelay: 5000,
    });

    // Activate WebSocket client
    client.activate();
    clientRef.current = client;

    // Cleanup on component unmount
    return () => {
      client.deactivate();
    };
  }, []);

  return data; // Return live data to be used by components
};

export default useWebSocket;
