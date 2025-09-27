import axios from 'axios';
import toast from 'react-hot-toast';
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
export const createPaperTradeOrder = async (orderData: CreateOrderRequest, user: string): Promise<PaperTradeOrder> => {
  try {
    const response = await axios.post<PaperTradeApiResponse>(`${API_BASE}/order/${user}`, orderData);
    if (response.data.paperTradeOrderResponse) {
      return response.data.paperTradeOrderResponse;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Error creating paper trade order:', error);
    
    // Handle different types of errors
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.statusText || 
                          error.message;
      
      if (status === 400) {
        toast.error(`Bad Request: ${errorMessage}`);
      } else if (status === 500) {
        toast.error(`Server Error: ${errorMessage}`);
      } else if (status === 401) {
        toast.error(`Unauthorized: ${errorMessage}`);
      } else if (status === 403) {
        toast.error(`Forbidden: ${errorMessage}`);
      } else if (status === 404) {
        toast.error(`Not Found: ${errorMessage}`);
      } else {
        toast.error(`Error ${status}: ${errorMessage}`);
      }
    } else {
      toast.error('An unexpected error occurred while creating the order');
    }
    
    throw error;
  }
};

// Exit an existing order
export const exitPaperTradeOrder = async (
  user: string,
  orderId: string,
  exitData: ExitOrderRequest
): Promise<PaperTradeOrder> => {
  try {
    const response = await axios.put<PaperTradeApiResponse>(
      `${API_BASE}/${user}/order/${orderId}/exit`,
      null,
      {
        params: {
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
export const getPaperTradeOrder = async (user: string, orderId: string): Promise<PaperTradeOrder> => {
  try {
    const response = await axios.get<PaperTradeApiResponse>(`${API_BASE}/order/${orderId}/${user}`);
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
export const getAllPaperTradeOrders = async (user: string): Promise<PaperTradeOrder[]> => {
  try {
    const response = await axios.get<PaperTradeApiResponse>(`${API_BASE}/orders/${user}`);
    return response.data.paperTradeOrderResponseList || [];
  } catch (error) {
    console.error('Error fetching all paper trade orders:', error);
    throw error;
  }
};

// Get active orders only
export const getActivePaperTradeOrders = async (user: string): Promise<PaperTradeOrder[]> => {
  try {
    const response = await axios.get<PaperTradeApiResponse>(`${API_BASE}/orders/active/${user}`);
    return response.data.paperTradeOrderResponseList || [];
  } catch (error) {
    console.error('Error fetching active paper trade orders:', error);
    throw error;
  }
};

// Get completed orders only
export const getCompletedPaperTradeOrders = async (user: string): Promise<PaperTradeOrder[]> => {
  try {
    const response = await axios.get<PaperTradeApiResponse>(`${API_BASE}/orders/completed/${user}`);
    return response.data.paperTradeOrderResponseList || [];
  } catch (error) {
    console.error('Error fetching completed paper trade orders:', error);
    throw error;
  }
};

// Cancel an order
export const cancelPaperTradeOrder = async (user: string, orderId: string): Promise<boolean> => {
  try {
    const response = await axios.delete<PaperTradeApiResponse>(`${API_BASE}/order/${orderId}/${user}`);
    return response.status === 200;
  } catch (error) {
    console.error('Error cancelling paper trade order:', error);
    throw error;
  }
};

// Get dashboard data
export const getPaperTradeDashboard = async (user: string): Promise<PaperTradeDashboard> => {
  try {
    const response = await axios.get<PaperTradeApiResponse>(`${API_BASE}/dashboard/${user}`);
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
  endDate: string,
  user: string
): Promise<PaperTradeOrder[]> => {
  try {
    const response = await axios.get<PaperTradeApiResponse>(`${API_BASE}/orders/date-range/${user}`, {
      params: { startDate, endDate }
    });
    return response.data.paperTradeOrderResponseList || [];
  } catch (error) {
    console.error('Error fetching paper trade orders by date range:', error);
    throw error;
  }
};

// Get orders by company
export const getPaperTradeOrdersByCompany = async (companyName: string, user: string): Promise<PaperTradeOrder[]> => {
  try {
    const response = await axios.get<PaperTradeApiResponse>(`${API_BASE}/orders/company/${companyName}/${user}`);
    return response.data.paperTradeOrderResponseList || [];
  } catch (error) {
    console.error('Error fetching paper trade orders by company:', error);
    throw error;
  }
};

// Get orders by instrument
export const getPaperTradeOrdersByInstrument = async (instrumentKey: string, user: string): Promise<PaperTradeOrder[]> => {
  try {
    const response = await axios.get<PaperTradeApiResponse>(`${API_BASE}/orders/instrument/${instrumentKey}/${user}`);
    return response.data.paperTradeOrderResponseList || [];
  } catch (error) {
    console.error('Error fetching paper trade orders by instrument:', error);
    throw error;
  }
};

// Get current capital
export const getCurrentCapital = async (user: string): Promise<number> => {
  try {
    const response = await axios.get<PaperTradeApiResponse>(`${API_BASE}/capital/${user}`);
    return response.data.capital || 0;
  } catch (error) {
    console.error('Error fetching current capital:', error);
    throw error;
  }
};

// Reset account
export const resetPaperTradeAccount = async (user: string, initialCapital: number = 3000000): Promise<boolean> => {
  try {
    const response = await axios.post<PaperTradeApiResponse>(`${API_BASE}/reset/${user}`, null, {
      params: { initialCapital }
    });
    return response.status === 200;
  } catch (error) {
    console.error('Error resetting paper trade account:', error);
    throw error;
  }
};