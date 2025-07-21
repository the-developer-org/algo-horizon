import { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';

// Define the interface for WebSocket data
// You can customize this based on your actual data structure
interface WebSocketData {
  [key: string]: any;
}

const SOCKET_URL = `${process.env.NEXT_PUBLIC_BACKEND_URL}${process.env.NEXT_PUBLIC_WS_PATH}`

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

const useWebSocket = (): { data: WebSocketData, isConnected: boolean } => {
  const [data, setData] = useState<WebSocketData>({});
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!isWithinTradingHours()) {
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
        console.log("Socket Connected")
        setIsConnected(true);
        // Subscribe to the WebSocket topic
        client.subscribe('/topic/data', (message: IMessage) => {
          console.log('Message Received');
          try {
            const newData: WebSocketData = JSON.parse(message.body);
            setData((prevData) => {
              const updatedData = { ...prevData, ...newData };
              console.log('Live Data Received');
              // console.log('WebSocket live data:', updatedData); // Optionally keep this for debugging
              return updatedData;
            });
          } catch (error) {
            console.error('Failed to parse WebSocket message', error);
          }
        });
        
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      debug: (str: string) => {},
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

  return { data, isConnected };
};

export default useWebSocket;