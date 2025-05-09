import { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';

// Define the interface for WebSocket data
// You can customize this based on your actual data structure
interface WebSocketData {
  [key: string]: any;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_BASE_URL + "/ws";

const useWebSocket = (): WebSocketData => {
  const [data, setData] = useState<WebSocketData>({});
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    // Create a new STOMP client
    const client = new Client({
      webSocketFactory: () => new SockJS(SOCKET_URL),
      
      onConnect: () => {
        console.log('Connected to WebSocket');
        
        // Subscribe to the WebSocket topic
        client.subscribe('/topic/data', (message: IMessage) => {
          try {
            const newData: WebSocketData = JSON.parse(message.body);
            console.log('Received:', newData);
            
            setData((prevData) => ({
              ...prevData,
              ...newData,
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
      if (clientRef.current?.connected) {
        clientRef.current.deactivate();
      }
    };
  }, []);

  return data;
};

export default useWebSocket;