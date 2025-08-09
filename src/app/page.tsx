"use client"

import Header from '@/components/Header';
import Vapi from '@vapi-ai/web';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2 } from 'lucide-react';

export default function Home() {
  const [callStart, setCallStart] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const vapiInstanceRef = useRef<any>(null);
  const callStartTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Format call duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start call duration timer
  const startDurationTimer = useCallback(() => {
    callStartTimeRef.current = Date.now();
    durationIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
      setCallDuration(elapsed);
    }, 1000);
  }, []);

  // Stop call duration timer
  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    setCallDuration(0);
  }, []);

  // Store event listeners as refs to ensure they exist when removing
  const callStartListenerRef = useRef<(() => void) | null>(null);
  const callEndListenerRef = useRef<(() => void) | null>(null);
  const errorListenerRef = useRef<((error: any) => void) | null>(null);
  const messageListenerRef = useRef<((message: any) => void) | null>(null);

  // Enhanced call start function
  const CallStart = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Validate environment variables
      if (!process.env.NEXT_PUBLIC_VAPI_API_KEY) {
        throw new Error('VAPI API key is not configured');
      }
      if (!process.env.NEXT_PUBLIC_VAPI_VOICE_ASSISTANT_ID) {
        throw new Error('VAPI Voice Assistant ID is not configured');
      }

      const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_API_KEY);
      vapiInstanceRef.current = vapi;

      // Create event listeners and store them in refs
      callStartListenerRef.current = () => {
        setCallStart(true);
        setIsConnecting(false);
        startDurationTimer();
      };

      callEndListenerRef.current = () => {
        setCallStart(false);
        setIsConnecting(false);
        stopDurationTimer();
      };

      errorListenerRef.current = (error: any) => {
        setError(`Connection error: ${error.message || 'Unknown error'}`);
        setIsConnecting(false);
        setCallStart(false);
        stopDurationTimer();
      };

      // messageListenerRef.current = (message: any) => {
      //   if (message.type === 'transcript' && message.transcript) {
      //     console.log(`${message.role}: ${message.transcript}`);
      //   }
      // };

      // Set up event listeners
      vapi.on('call-start', callStartListenerRef.current);
      vapi.on('call-end', callEndListenerRef.current);
      vapi.on('error', errorListenerRef.current);
      // vapi.on('message', messageListenerRef.current);

      // Start the call
      await vapi.start(process.env.NEXT_PUBLIC_VAPI_VOICE_ASSISTANT_ID);

    } catch (error: any) {
      setError(error.message || 'Failed to start call');
      setIsConnecting(false);
      setCallStart(false);
    }
  }, [startDurationTimer, stopDurationTimer]);

  // Enhanced call end function
  const callEnd = useCallback(() => {
    try {
      if (!vapiInstanceRef.current) return;

      const vapi = vapiInstanceRef.current;

      // Reset state immediately for better UX
      setCallStart(false);
      setIsConnecting(false);
      stopDurationTimer();

      // Remove event listeners using the stored references
      if (callStartListenerRef.current) {
        vapi.off('call-start', callStartListenerRef.current);
        callStartListenerRef.current = null;
      }

      if (callEndListenerRef.current) {
        vapi.off('call-end', callEndListenerRef.current);
        callEndListenerRef.current = null;
      }

      if (errorListenerRef.current) {
        vapi.off('error', errorListenerRef.current);
        errorListenerRef.current = null;
      }

      if (messageListenerRef.current) {
        vapi.off('message', messageListenerRef.current);
        messageListenerRef.current = null;
      }

      // Stop the call after removing listeners
      vapi.stop();

      // Clear the instance
      vapiInstanceRef.current = null;

    } catch (error: any) {
      console.error('Error ending call:', error);
      // Still reset state even if there's an error
      setCallStart(false);
      setIsConnecting(false);
      stopDurationTimer();
      vapiInstanceRef.current = null;
    }
  }, [stopDurationTimer]);

  // Toggle mute function
  const toggleMute = useCallback(() => {
    if (vapiInstanceRef.current && callStart) {
      const newMutedState = !isMuted;
      vapiInstanceRef.current.setMuted(newMutedState);
      setIsMuted(newMutedState);
    }
  }, [isMuted, callStart]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopDurationTimer();
      if (vapiInstanceRef.current) {
        try {
          // Remove listeners using stored references
          if (callStartListenerRef.current) {
            vapiInstanceRef.current.off('call-start', callStartListenerRef.current);
          }
          if (callEndListenerRef.current) {
            vapiInstanceRef.current.off('call-end', callEndListenerRef.current);
          }
          if (errorListenerRef.current) {
            vapiInstanceRef.current.off('error', errorListenerRef.current);
          }
          if (messageListenerRef.current) {
            vapiInstanceRef.current.off('message', messageListenerRef.current);
          }

          vapiInstanceRef.current.stop();
        } catch (error) {
          console.error('Cleanup error:', error);
        }
      }
    };
  }, [stopDurationTimer]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FFFEFE]">
      <Header />

      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <div className="text-center max-w-4xl mx-auto">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <p className="font-medium">Connection Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Main Content */}
          <div className="mb-12">
            {/* Status Indicator */}
            <div className="mb-8">
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${callStart
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : isConnecting
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${callStart
                    ? 'bg-green-500 animate-pulse'
                    : isConnecting
                      ? 'bg-yellow-500 animate-pulse'
                      : 'bg-gray-400'
                  }`} />
                {callStart ? `Connected • ${formatDuration(callDuration)}` : isConnecting ? 'Connecting...' : 'Ready to connect'}
              </div>
            </div>

            {/* Heading */}
            <h1 className="text-3xl md:text-5xl font-medium mb-6">
              <span className="text-[#1D1B1A]">
                Your Buddy
              </span>
              <br />
              <span className="text-[#1D1B1A]">
                in Every Conversation
              </span>
            </h1>

            {/* Sub-text */}
            <p className="text-lg text-[#514F4F] mb-12 max-w-2xl mx-auto leading-relaxed">
              Experience seamless AI conversations with natural voice interactions
              <br />
              <span className="text-lg text-[#514F4F]">Just tap and start talking</span>
            </p>

            {/* Call Button */}
            <div className="mb-8">
              {!callStart ? (
                <button
                  onClick={CallStart}
                  disabled={isConnecting}
                  className={`group relative px-9 py-4 text-lg cursor-pointer font-medium rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95 ${isConnecting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-400 shadow-2xl hover:shadow-blue-400/25'
                    } text-white`}
                >
                  <div className="flex items-center space-x-3">
                    {isConnecting ? (
                      <>
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <Phone className="w-5 h-5" />
                        <span>Start Conversation</span>
                      </>
                    )}
                  </div>

                  {!isConnecting && (
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                  )}
                </button>
              ) : (
                <div className="space-y-4">
                  {/* Call Controls */}
                  <div className="flex items-center justify-center space-x-4">
                    {/* Mute Toggle */}
                    <button
                      onClick={toggleMute}
                      className={`p-4 rounded-full transition-all duration-300 ${isMuted
                          ? 'bg-red-100 text-red-600 hover:bg-red-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-6 h-6" />}
                    </button>

                    {/* End Call */}
                    <button
                      onClick={callEnd}
                      className="group px-9 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-lg font-medium rounded-full shadow-2xl hover:shadow-red-500/25 transition-all duration-300 transform hover:scale-105 active:scale-95"
                    >
                      <div className="flex items-center space-x-3">
                        <PhoneOff className="w-5 h-5" />
                        <span>End Call</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}