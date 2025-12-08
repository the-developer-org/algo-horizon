"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';

interface LTPData {
  [instrument: string]: {
    price: number;
    timestamp: number;
    change?: number;
    changePercent?: number;
  };
}

interface MarketDataContextType {
  ltpData: LTPData;
  isConnected: boolean;
  connectionStatus: string;
  reconnect: () => void;
}

const MarketDataContext = createContext<MarketDataContextType | undefined>(undefined);

export const useMarketData = () => {
  const context = useContext(MarketDataContext);
  if (!context) {
    throw new Error('useMarketData must be used within a MarketDataProvider');
  }
  return context;
};

interface MarketDataProviderProps {
  children: ReactNode;
}

export const MarketDataProvider: React.FC<MarketDataProviderProps> = ({ children }) => {
  const [ltpData, setLtpData] = useState<LTPData>({});
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const eventSourceRef = useRef<EventSource | null>(null);

  // Check if current time is within market hours (9:15 AM to 3:30 PM, Mon-Fri)
  const isMarketOpen = useCallback(() => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Check if it's Monday to Friday
    if (day === 0 || day === 6) return false;

    // Check if it's between 9:15 AM and 3:30 PM
    const currentMinutes = hours * 60 + minutes;
    const marketOpenMinutes = 9 * 60 + 15; // 9:15 AM
    const marketCloseMinutes = 15 * 60 + 30; // 3:30 PM

    return currentMinutes >= marketOpenMinutes && currentMinutes <= marketCloseMinutes;
  }, []);

  const connect = useCallback(() => {
    // Check if market is open before attempting connection
    if (!isMarketOpen()) {
      setIsConnected(false);
      setConnectionStatus('Market Closed');
      return;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Connect to SSE endpoint
    const eventSource = new EventSource('/api/market-data/sse');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setConnectionStatus('Connected');
    };

    eventSource.onmessage = (event) => {
      console.log('EventSource onmessage fired with event:', event);
      try {
        const data = JSON.parse(event.data);
        console.log('Received SSE data:', data);

        // Handle the backend format: {"NSE_EQ|INE758T01015": 286.25}
        // Extract instrument and price from the single key-value pair
        const instruments = Object.keys(data);
        if (instruments.length !== 1) {
          console.warn('Expected exactly one instrument in data, got:', instruments.length);
          return;
        }

        const instrument = instruments[0];
        const price = data[instrument];

        if (typeof price !== 'number' || isNaN(price)) {
          console.warn('Invalid price value:', price);
          return;
        }

        console.log('Parsed instrument:', instrument, 'price:', price);

        // Update the LTP data
        setLtpData(prev => ({
          ...prev,
          [instrument]: {
            price: price,
            timestamp: Date.now(),
            change: undefined, // Backend doesn't provide change data
            changePercent: undefined, // Backend doesn't provide change percent
          }
        }));
      } catch (error) {
        console.error('Error parsing SSE data:', error, 'Raw data:', event.data);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setConnectionStatus('Connection Error');
    };
  }, []);

  const reconnect = useCallback(() => {
    if (!isMarketOpen()) {
      setConnectionStatus('Market Closed - Cannot reconnect outside market hours');
      setTimeout(() => setConnectionStatus('Market Closed'), 3000);
      return;
    }

    setConnectionStatus('Reconnecting...');
    connect();
  }, [connect, isMarketOpen]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connect]);

  // Check market status every minute and update connection accordingly
  useEffect(() => {
    const checkMarketStatus = () => {
      const marketOpen = isMarketOpen();
      const currentStatus = connectionStatus;

      if (marketOpen && currentStatus === 'Market Closed') {
        // Market just opened, attempt to connect
        connect();
      } else if (!marketOpen && (currentStatus === 'Connected' || currentStatus === 'Connection Error')) {
        // Market just closed, disconnect
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        setIsConnected(false);
        setConnectionStatus('Market Closed');
        setLtpData({}); // Clear data when market closes
      }
    };

    // Check immediately
    checkMarketStatus();

    // Check every minute
    const interval = setInterval(checkMarketStatus, 60000);

    return () => clearInterval(interval);
  }, [isMarketOpen, connectionStatus, connect]);

  return (
    <MarketDataContext.Provider value={{ ltpData, isConnected, connectionStatus, reconnect }}>
      {children}
    </MarketDataContext.Provider>
  );
};