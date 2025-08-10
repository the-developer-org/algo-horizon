"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";

export default function AuthPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShow, setShouldShow] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);

  const baseBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    const isAuthorized = sessionStorage.getItem('isUserAuthorised');
    if (isAuthorized === 'true') {
      router.replace('/');
    } else {
      setShouldShow(true);
    }
    setIsLoading(false);
  }, [router]);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and max 6 digits
    if (/^\d{0,6}$/.test(value)) {
      setPin(value);
      setError('');
      setIsInvalid(false); // Reset invalid state when user starts typing
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4 || pin.length > 6) {
      setError('PIN must be 4 to 6 digits');
      return;
    }

    // Hard check for PIN validation
    const validPins = ['726746', '2534'];
    if (!validPins.includes(pin)) {
      setError('Invalid PIN');
      setIsInvalid(true);
      return;
    }    
      
  };

  if (isLoading || !shouldShow) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const buttonClass = isInvalid ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600';

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
        
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 w-full">
          <div className="flex flex-col items-center gap-2 w-full">
            <input
              type="password"
              value={pin}
              onChange={handlePinChange}
              placeholder="Enter 4-6 digit PIN"
              className={`w-full max-w-[200px] h-[48px] text-center text-xl bg-white bg-opacity-90 rounded-lg 
                       border-2 focus:outline-none transition-colors duration-300
                       ${isInvalid 
                         ? 'border-red-500 focus:border-red-600' 
                         : 'border-green-500 focus:border-green-600'}`}
              maxLength={6}
              disabled={isSubmitting}
              autoComplete="off"
            />
            {error && (
              <p className="text-red-500 text-sm font-semibold">{error}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || pin.length < 4 || pin.length > 6}
            className={`w-[200px] h-[48px] text-white font-semibold rounded-lg transition-colors duration-200 
                     ${isSubmitting || pin.length < 4 || pin.length > 6 
                       ? 'bg-gray-500 cursor-not-allowed' 
                       : buttonClass}`}
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : (
              'Verify PIN'
            )}
          </Button>
        </form>
      </div>
    </main>
  );
}