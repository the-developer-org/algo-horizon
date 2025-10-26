// WhatsApp utility functions for sending OTPs

import {whatsappConfig} from '@/lib/upstox-meta-config';

// Get user phone number based on username
export function getUserPhone(username: string): string {
  return whatsappConfig.userPhoneNumbers[username] || '';
}

// Send masked OTP to WhatsApp service
export const sendOtpToWhatsApp = async (maskedOtp: number, username: string): Promise<boolean> => {
  try {
    // Send masked OTP directly to WhatsApp service
    // In production, replace with actual WhatsApp API endpoint
    const WhatsAppApiUrl = process.env.NEXT_PUBLIC_WHATSAPP_API_URL;
    const response = await fetch(`${WhatsAppApiUrl}/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: maskedOtp,
        groupName: getUserPhone(username)
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to send OTP:', error);
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



