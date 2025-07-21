import { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';

// Define the interface for WebSocket data
// You can customize this based on your actual data structure
interface WebSocketData {
  [key: string]: any;
}

const SOCKET_URL = `${process.env.NEXT_PUBLIC_BACKEND_URL}${process.env.NEXT_PUBLIC_WS_PATH}`;

const isWithinTradingHours = (): boolean => {
  const now = new Date();
  const day = now.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6

  if (day === 0 || day === 6) return false; // Skip Saturday and Sunday

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  const start = 9 * 60 + 30;  // 9:30 AM = 570
  const end = 15 * 60 + 30;   // 3:30 PM = 930

  return timeInMinutes >= start && timeInMinutes <= end;
};

const useWebSocket = (): WebSocketData => {
  const [data, setData] = useState<WebSocketData>({});
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {

    if (!isWithinTradingHours()) {
      console.log("Outside trading hours — WebSocket not connected.");
      return;
    }

    // Create a new STOMP client
    const client = new Client({
webSocketFactory: () => {
  const sock = new SockJS(SOCKET_URL, null, {
    transports: ['websocket'], // 👈 Force only websocket transport
  });

  (sock as any).withCredentials = false;
  return sock;
},





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