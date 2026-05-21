'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, X, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface CameraModuleProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Image: string) => void;
}

export function CameraModule({ isOpen, onClose, onCapture }: CameraModuleProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setIsInitializing(true);
    setError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access is not supported by your browser.");
      }

      let newStream: MediaStream;

      // Stage 1: Attempt connection with preferred constraints
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: { ideal: facingMode },
            width: { ideal: 1080 },
            height: { ideal: 1920 }
          }
        });
      } catch (e) {
        console.warn("Primary camera constraints failed, attempting fallback...", e);
        // Stage 2: Absolute fallback
        newStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = newStream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        await videoRef.current.play().catch(err => {
          console.error("Video play failed:", err);
        });
      }
    } catch (err: any) {
      console.error("Camera initialization error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Camera permission denied. Please allow access in your browser settings to scan cards.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError("No camera hardware detected. If you are on a desktop, please ensure your webcam is connected.");
      } else {
        setError(err.message || "An unexpected error occurred while accessing the camera.");
      }
    } finally {
      setIsInitializing(false);
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(startCamera, 400);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    }
  }, [isOpen, startCamera, stopCamera]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      const width = video.videoWidth;
      const height = video.videoHeight;
      
      if (width && height) {
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (context) {
          context.drawImage(video, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          onCapture(dataUrl);
          onClose();
        }
      }
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-black border-zinc-800 p-0 overflow-hidden outline-none">
        <DialogHeader className="p-4 bg-zinc-900/90 absolute top-0 left-0 right-0 z-20 backdrop-blur-md border-b border-white/5">
          <DialogTitle className="text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-accent" />
            Vertical Card Scanner
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Align the trip card vertically within the frame.
          </DialogDescription>
        </DialogHeader>

        {/* Changed to vertical aspect ratio aspect-[3/4] and min-h */}
        <div className="relative aspect-[3/4] bg-zinc-950 flex items-center justify-center overflow-hidden min-h-[500px]">
          {error ? (
            <div className="p-10 text-center space-y-4 z-10">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-2" />
              <p className="text-white font-medium max-w-xs mx-auto">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={startCamera} 
                className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
              >
                Retry Camera Access
              </Button>
            </div>
          ) : (
            <>
              {isInitializing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-30">
                  <RefreshCw className="w-8 h-8 text-accent animate-spin mb-4" />
                  <p className="text-xs text-zinc-500 font-mono animate-pulse">Initializing lens...</p>
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover" 
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {!isInitializing && !error && (
                /* Adjusted vertical scan guide corners */
                <div className="absolute inset-x-12 inset-y-16 border-2 border-white/10 rounded-lg pointer-events-none z-10">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-accent rounded-tl-sm shadow-[0_0_15px_rgba(82,206,224,0.4)]" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-accent rounded-tr-sm shadow-[0_0_15px_rgba(82,206,224,0.4)]" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-accent rounded-bl-sm shadow-[0_0_15px_rgba(82,206,224,0.4)]" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-accent rounded-br-sm shadow-[0_0_15px_rgba(82,206,224,0.4)]" />
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-6 bg-zinc-900 flex items-center justify-between gap-4 border-t border-white/5">
          <Button variant="ghost" size="icon" onClick={onClose} className="text-zinc-400 hover:text-white hover:bg-white/10 rounded-full h-12 w-12 transition-colors">
            <X className="w-6 h-6" />
          </Button>
          
          <button 
            onClick={handleCapture}
            disabled={!!error || isInitializing}
            className="group relative flex items-center justify-center w-20 h-20 rounded-full bg-white transition-all active:scale-90 disabled:opacity-20 shadow-[0_0_30px_rgba(255,255,255,0.25)]"
            aria-label="Capture Photo"
          >
            <div className="w-16 h-16 rounded-full border-4 border-black/10 flex items-center justify-center">
               <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center">
                 <div className="w-8 h-8 rounded-full bg-accent animate-pulse" />
               </div>
            </div>
          </button>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleCamera} 
            disabled={isInitializing || !!error}
            className="text-zinc-400 hover:text-white hover:bg-white/10 rounded-full h-12 w-12 transition-colors"
          >
            <RefreshCw className="w-6 h-6" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
