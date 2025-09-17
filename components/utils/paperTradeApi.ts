import axios from 'axios';
import {
  PaperTradeDashboard,
  PaperTradeOrder,
  CreateOrderRequest,
  ExitOrderRequest,
  PaperTradeApiResponse
} from '../types/paper-trading';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
const API_BASE = `${BASE_URL}/api/paper-trade`;

// Create a new paper trade order
export const createPaperTradeOrder = async (orderData: CreateOrderRequest): Promise<PaperTradeOrder> => {
  try {
    const response = await axios.post<PaperTradeApiResponse>(`${API_BASE}/order`, orderData);
    if (response.data.paperTradeOrderResponse) {
      return response.data.paperTradeOrderResponse;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Error creating paper trade order:', error);
    throw error;
  }
};

// Exit an existing order
export const exitPaperTradeOrder = async (
  orderId: string,
  exitData: ExitOrderRequest
): Promise<PaperTradeOrder> => {
  try {
    const response = await axios.put<PaperTradeApiResponse>(
      `${API_BASE}/order/${orderId}/exit`,
      null,
      {
        params: {
          exitPrice: exitData.exitPrice,
          exitReason: exitData.exitReason
        }
      }
    );
    if (response.data.paperTradeOrderResponse) {
      return response.data.paperTradeOrderResponse;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Error exiting paper trade order:', error);
    throw error;
  }
};

// Get a specific order by ID
export const getPaperTradeOrder = async (orderId: string): Promise<PaperTradeOrder> => {
  try {
    const response = await axios.get<PaperTradeApiResponse>(`${API_BASE}/order/${orderId}`);
    if (response.data.paperTradeOrderResponse) {
      return response.data.paperTradeOrderResponse;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Error fetching paper trade order:', error);
    throw error;
  }
};

// Get all orders
export const getAllPaperTradeOrders = async (): Promise<PaperTradeOrder[]> => {
  try {
    const response = await axios.get<PaperTradeApiResponse>(`${API_BASE}/orders`);
    return response.data.paperTradeOrderResponseList || [];
  } catch (error) {
    console.error('Error fetching all paper trade orders:', error);
    throw error;
  }
};

// Get active orders only
export const getActivePaperTradeOrders = async (): Promise<PaperTradeOrder[]> => {
  try {
    const response = await axios.get<PaperTradeApiResponse>(`${API_BASE}/orders/active`);
    return response.data.paperTradeOrderResponseList || [];
  } catch (error) {
    console.error('Error fetching active paper trade orders:', error);
    throw error;
  }
};

// Get completed orders only
export const getCompletedPaperTradeOrders = async (): Promise<PaperTradeOrder[]> => {
  try {
    const response = await axios.get<PaperTradeApiResponse>(`${API_BASE}/orders/completed`);
    return response.data.paperTradeOrderResponseList || [];
  } catch (error) {
    console.error('Error fetching completed paper trade orders:', error);
    throw error;
  }
};

// Cancel an order
export const cancelPaperTradeOrder = async (orderId: string): Promise<boolean> => {
  try {
    const response = await axios.delete<PaperTradeApiResponse>(`${API_BASE}/order/${orderId}`);
    return response.status === 200;
  } catch (error) {
    console.error('Error cancelling paper trade order:', error);
    throw error;
  }
};

// Get dashboard data
export const getPaperTradeDashboard = async (): Promise<PaperTradeDashboard> => {
  try {
    const response = await axios.get<PaperTradeApiResponse>(`${API_BASE}/dashboard`);
    if (response.data.tradeDashboardResponse) {
      return response.data.tradeDashboardResponse;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Error fetching paper trade dashboard:', error);
    throw error;
  }
};

// Get orders by date range
export const getPaperTradeOrdersByDateRange = async (
  startDate: string,
  endDate: string
): Promise<PaperTradeOrder[]> => {
  try {
    const response = await axios.get<PaperTradeApiResponse>(`${API_BASE}/orders/date-range`, {
      params: { startDate, endDate }
    });
    return response.data.paperTradeOrderResponseList || [];
  } catch (error) {
    console.error('Error fetching paper trade orders by date range:', error);
    throw error;
  }
};

// Get orders by company
export const getPaperTradeOrdersByCompany = async (companyName: string): Promise<PaperTradeOrder[]> => {
  try {
    const response = await axios.get<PaperTradeApiResponse>(`${API_BASE}/orders/company/${companyName}`);
    return response.data.paperTradeOrderResponseList || [];
  } catch (error) {
    console.error('Error fetching paper trade orders by company:', error);
    throw error;
  }
};

// Get orders by instrument
export const getPaperTradeOrdersByInstrument = async (instrumentKey: string): Promise<PaperTradeOrder[]> => {
  try {
    const response = await axios.get<PaperTradeApiResponse>(`${API_BASE}/orders/instrument/${instrumentKey}`);
    return response.data.paperTradeOrderResponseList || [];
  } catch (error) {
    console.error('Error fetching paper trade orders by instrument:', error);
    throw error;
  }
};

// Get current capital
export const getCurrentCapital = async (): Promise<number> => {
  try {
    const response = await axios.get<PaperTradeApiResponse>(`${API_BASE}/capital`);
    return response.data.capital || 0;
  } catch (error) {
    console.error('Error fetching current capital:', error);
    throw error;
  }
};

// Reset account
export const resetPaperTradeAccount = async (initialCapital: number = 3000000): Promise<boolean> => {
  try {
    const response = await axios.post<PaperTradeApiResponse>(`${API_BASE}/reset`, null, {
      params: { initialCapital }
    });
    return response.status === 200;
  } catch (error) {
    console.error('Error resetting paper trade account:', error);
    throw error;
  }
};