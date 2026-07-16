// WhatsApp utility functions for sending OTPs

import {whatsappConfig} from '@/lib/upstox-meta-config';

// Get user phone number based on username
export function getUserPhone(username: string): string {
  return whatsappConfig.userPhoneNumbers[username] || '';
}

const getLocalPhoneNumber = (username: string) =>
  getUserPhone(username).replace(/\D/g, '').replace(/^91/, '');

// Send masked OTP to WhatsApp service
export const sendOtpToWhatsApp = async (maskedOtp: number, username: string): Promise<boolean> => {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const phoneNumber = getLocalPhoneNumber(username);
    if (!backendUrl || !phoneNumber) return false;

    const response = await fetch(`${backendUrl}/api/login/send-otp/${encodeURIComponent(phoneNumber)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: maskedOtp,
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to send OTP:', error);
    return false;
  }
};

export const verifyOtpWithBackend = async (username: string, otp: string): Promise<boolean> => {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const phoneNumber = getLocalPhoneNumber(username);
    if (!backendUrl || !phoneNumber || !otp) return false;

    const params = new URLSearchParams({ phoneNumber, otp });
    const response = await fetch(`${backendUrl}/api/login/verify-otp?${params.toString()}`, {
      method: 'POST',
    });
    if (!response.ok) return false;

    const responseText = await response.text();
    if (!responseText) return true;

    try {
      const result = JSON.parse(responseText);
      if (typeof result === 'boolean') return result;
      return result.success ?? result.valid ?? result.verified ?? true;
    } catch {
      return responseText.trim().toLowerCase() !== 'false';
    }
  } catch (error) {
    console.error('Failed to verify OTP:', error);
    return false;
  }
};


export const sendWhatsAppAlert = async (groupName: string, message: string): Promise<boolean> => {
  try {
    // Send masked OTP directly to WhatsApp service
    // In production, replace with actual WhatsApp API endpoint
    const WhatsAppApiUrl = process.env.NEXT_PUBLIC_WHATSAPP_API_URL;
    const response = await fetch(`${WhatsAppApiUrl}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        groupName,
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to send OTP:', error);
    return false;
  }
};



