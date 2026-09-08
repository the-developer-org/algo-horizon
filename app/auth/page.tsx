"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { sendOtpToWhatsApp, verifyOtpWithBackend, getUserPhone } from '@/utils/whatsappUtils';
import axios from 'axios';
import { ArrowRight, LockKeyhole, MessageCircle, ShieldCheck } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShow, setShouldShow] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isInvalid, setIsInvalid] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [isGeneratingOtp, setIsGeneratingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  // OTP masking function
  const maskOtp = (otp: string): number => {
    const num = parseInt(otp);
    // Apply masking: (otp * 7) + 123 - 456
    return (num * 7) + 123 - 456;
  };

  // Generate random 5-digit OTP
  const generateOtp = (): string => {
    return Math.floor(10000 + Math.random() * 90000).toString();
  };

  useEffect(() => {
    // Keep the login page available so an authenticated user can switch accounts.
    setShouldShow(true);
    setIsLoading(false);
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    // Only allow single digits
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');
    setIsInvalid(false);

    // Auto-focus next input
    if (value && index < 4) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleGenerateOtp = async () => {
    if (!username) {
      setError('Please select a username first');
      return;
    }

    setIsGeneratingOtp(true);
    setError('');
    setSuccessMessage('');
    setOtpSent(false); // Reset otpSent while sending
    setOtp(['', '', '', '', '']);

    try {
      const newOtp = generateOtp();
      const sent = await sendOtpToWhatsApp(maskOtp(newOtp), username);

      if (!sent) {
        throw new Error('OTP delivery failed');
      }

      setOtpSent(true);
      setError('');
      setSuccessMessage('OTP sent successfully.');
    } catch (err) {
      setError('Failed to generate OTP. Please try again.');
      setOtpSent(false);
    } finally {
      setIsGeneratingOtp(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otpSent) {
      setError('Please generate OTP first');
      setSuccessMessage('');
      return;
    }

    const otpString = otp.join('');
    if (otpString.length !== 5) {
      setError('Please enter a valid 5-digit OTP');
      setSuccessMessage('');
      return;
    }

    setIsVerifyingOtp(true);
    setSuccessMessage('');

    try {
      const isValidOtp = await verifyOtpWithBackend(username, otpString);

      if (isValidOtp) {
        setError('');
        // Store the authenticated user for the active browser session.
        sessionStorage.setItem('isUserAuthorised', 'true');
        sessionStorage.setItem('currentUser', username);
        localStorage.setItem('isUserAuthorised', 'true');
        localStorage.setItem('currentUser', username);

        // Log login event (fire-and-forget)
        const phoneNumber = getUserPhone(username);
        if (phoneNumber) {
          axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/audit/logLogin?phoneNumber=${encodeURIComponent(phoneNumber)}`, {
            headers: {
              'Content-Type': 'application/json',
            },
          }).catch(error => {
            console.warn('Failed to log login event:', error);
          });
        }

        router.replace('/');
      } else {
        setError('Invalid OTP. Please try again.');
        setIsInvalid(true);
        setOtp(['', '', '', '', '']);
      }
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  if (isLoading || !shouldShow) {
    return (
      <div className="auth-loading-shell">
        <div className="app-loading-spinner" />
      </div>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-orbit auth-orbit-one" aria-hidden="true" />
      <div className="auth-orbit auth-orbit-two" aria-hidden="true" />
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-brand-mark"><LockKeyhole className="size-6" /></div>
        <div className="auth-heading">
          <p className="auth-eyebrow">Secure access</p>
          <h1 id="auth-title">Welcome to Algo Horizon</h1>
        </div>
        <div className="auth-step-row">
          <span className="auth-step auth-step-active"><MessageCircle className="size-4" /> 1. Send code</span>
          <span className="auth-step"><ShieldCheck className="size-4" /> 2. Verify</span>
        </div>
        
        {/* OTP Login Form */}
        <form onSubmit={handleOtpSubmit} className="auth-form">
            <div className="auth-field-group">
              <label htmlFor="auth-user">Choose your profile</label>
              <div className="auth-user-row">
                <select
                  id="auth-user"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                    setSuccessMessage('');
                    setIsInvalid(false);
                    setOtpSent(false);
                    setOtp(['', '', '', '', '']);
                  }}
                  className="auth-select"
                >
                  <option value="" disabled>Select user to login</option>
                  <option value="Nawaz">Nawaz</option>
                  <option value="Sadiq">Sadiq</option>
                  <option value="Abrar">Abrar</option>
                </select>
                <button
                  type="button"
                  onClick={handleGenerateOtp}
                  disabled={isGeneratingOtp || !username}
                  className={`auth-primary-button
                           ${isGeneratingOtp || !username
                             ? 'auth-button-disabled' 
                             : ''}`}
                >
                  {isGeneratingOtp ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    'Send OTP'
                  )}
                </button>
              </div>
            </div>

            <div className="auth-field-group auth-otp-group">
              <div className="auth-otp-label-row"><label>Enter your 5-digit code</label></div>
              <div className="auth-otp-row">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div key={`otp-box-${index}`} className="flex items-center">
                    <input
                      id={`otp-${index}`}
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={otp[index]}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className={`auth-otp-input
                               ${isInvalid 
                                 ? 'auth-otp-invalid' 
                                 : ''}`}
                      maxLength={1}
                      disabled={!otpSent}
                      autoComplete="off"
                    />
                    {index < 4 && (
                      <span className="auth-otp-divider">-</span>
                    )}
                  </div>
                ))}
              </div>
              {error && (
                <p className="auth-message auth-error">{error}</p>
              )}
              {successMessage && (
                <p className="auth-message auth-success">{successMessage}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isVerifyingOtp || !otpSent || otp.some(digit => digit === '')}
              className={`auth-submit-button
                       ${isVerifyingOtp || !otpSent || otp.some(digit => digit === '')
                         ? 'auth-button-disabled' 
                         : ''}`}
            >
              {isVerifyingOtp ? 'Verifying...' : <>Verify OTP <ArrowRight className="size-4" /></>}
            </Button>
          </form>
      </section>
    </main>
  );
}
