"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { sendOtpToWhatsApp } from '@/utils/whatsappUtils';

export default function AuthPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShow, setShouldShow] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isInvalid, setIsInvalid] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '']);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isGeneratingOtp, setIsGeneratingOtp] = useState(false);
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
    const isAuthorized = sessionStorage.getItem('isUserAuthorised');
    if (isAuthorized === 'true') {
      router.replace('/');
    } else {
      setShouldShow(true);
    }
    setIsLoading(false);
  }, [router]);

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
    setOtpSent(false); // Reset otpSent while sending

    try {
      // Generate random 5-digit OTP
      const newOtp = generateOtp();
      setGeneratedOtp(newOtp);

      // Mask the OTP
      const maskedOtp = maskOtp(newOtp);

      // Send masked OTP to WhatsApp service
      debugger
      const success = await sendOtpToWhatsApp(maskedOtp, username);

      if (success) {
        setOtpSent(true);
        setError('');
      } else {
        setError('Failed to send OTP. Please try again.');
        setOtpSent(false);
      }
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
      return;
    }

    const otpString = otp.join('');
    if (otpString.length !== 5) {
      setError('Please enter a valid 5-digit OTP');
      return;
    }

    // Verify OTP against the originally generated OTP
    if (otpString === generatedOtp) {
      setError('');
      // Store user session
      sessionStorage.setItem('isUserAuthorised', 'true');
      localStorage.setItem('currentUser', username);
      router.replace('/');
    } else {
      setError('Invalid OTP. Please try again.');
      setIsInvalid(true);
      setOtp(['', '', '', '', '']);
    }
  };

  if (isLoading || !shouldShow) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <main 
      className="min-h-screen bg-cover bg-center bg-fixed flex items-center justify-center"
      style={{
        backgroundImage: `url('https://images.pexels.com/photos/730547/pexels-photo-730547.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1')`,
      }}
    >
      <div className="bg-black bg-opacity-60 p-8 rounded-lg flex flex-col items-center gap-6 w-full max-w-md mx-4">
        <h1 
          className={`text-3xl md:text-4xl font-bold text-white uppercase px-8 py-4 rounded-lg text-center tracking-widest w-full
          ${isInvalid ? 'bg-red-600 bg-opacity-40' : 'bg-green-600 bg-opacity-40'}`}
        >
          ALGOHORIZON
        </h1>
        
        {/* OTP Login Form */}
        <form onSubmit={handleOtpSubmit} className="flex flex-col items-center gap-4 w-full">
            <div className="flex flex-col items-center gap-2 w-full">
              <div className="flex gap-2 w-full max-w-[340px]">
                <select
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                    setIsInvalid(false);
                    setOtpSent(false);
                    setOtp(['', '', '', '', '']);
                  }}
                  className="flex-1 h-[48px] bg-white bg-opacity-90 border-2 border-green-500 focus:border-green-600 rounded-lg text-center"
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
                  className={`px-4  h-[48px] text-white font-semibold rounded-lg transition-colors duration-200 
                           ${isGeneratingOtp || !username
                             ? 'bg-gray-500 cursor-not-allowed' 
                             : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {isGeneratingOtp ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    'Send OTP'
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 w-full">
              <div className="flex items-center gap-2">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div key={`otp-box-${index}`} className="flex items-center">
                    <input
                      id={`otp-${index}`}
                      type="text"
                      value={otp[index]}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className={`w-12 h-12 text-center text-xl bg-white bg-opacity-90 rounded-lg 
                               border-2 focus:outline-none transition-colors duration-300
                               ${isInvalid 
                                 ? 'border-red-500 focus:border-red-600' 
                                 : 'border-green-500 focus:border-green-600'}`}
                      maxLength={1}
                      disabled={!otpSent}
                      autoComplete="off"
                    />
                    {index < 4 && (
                      <span className="mx-1 text-white text-xl font-bold">-</span>
                    )}
                  </div>
                ))}
              </div>
              {otpSent && (
                <p className="text-green-400 text-sm font-semibold">OTP sent to WhatsApp!</p>
              )}
              {error && (
                <p className="text-red-500 text-sm font-semibold">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={!otpSent || otp.some(digit => digit === '')}
              className={`w-[200px] h-[48px] text-white font-semibold rounded-lg transition-colors duration-200 
                       ${!otpSent || otp.some(digit => digit === '')
                         ? 'bg-gray-500 cursor-not-allowed' 
                         : 'bg-green-600 hover:bg-green-700'}`}
            >
              Verify OTP
            </Button>
          </form>
      </div>
    </main>
  );
}