'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, X, RefreshCw, Circle, AlertCircle } from 'lucide-react';
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
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const startCamera = useCallback(async () => {
    if (isInitializing) return;
    setIsInitializing(true);
    setError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this environment.");
      }

      // Stop any existing stream before starting a new one
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      let newStream: MediaStream | null = null;

      try {
        // Try with ideal constraints first. 
        // Using 'ideal' instead of 'exact' is critical for compatibility across desktops and mobiles.
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });
      } catch (err) {
        console.warn("Preferred constraints failed, falling back to basic video.", err);
        // Final fallback: just get any video device. This is most likely to trigger the permission prompt.
        newStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      if (!newStream) {
        throw new Error("Could not initialize camera stream.");
      }

      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.error("Error playing video:", e));
        };
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Camera permission denied. Please allow access in your browser settings.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError("Requested camera device not found. Please ensure your camera is connected.");
      } else {
        setError(`Camera Error: ${err.message || "Unable to start video"}`);
      }
    } finally {
      setIsInitializing(false);
    }
  }, [facingMode, stream, isInitializing]);

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the DOM is ready and constraints are settled
      const timer = setTimeout(() => {
        startCamera();
      }, 150);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen]);

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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          onCapture(dataUrl);
          onClose();
        }
      }
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  // Restart camera when facingMode changes
  useEffect(() => {
    if (isOpen) {
      stopCamera();
      startCamera();
    }
  }, [facingMode]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl bg-black border-zinc-800 p-0 overflow-hidden outline-none">
        <DialogHeader className="p-4 bg-zinc-900/50 absolute top-0 left-0 right-0 z-10 backdrop-blur-md">
          <DialogTitle className="text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-accent" />
            Scanner Mode
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Center the trip card in the viewfinder.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-10 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-2" />
              <p className="text-white font-medium">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => startCamera()} 
                className="bg-zinc-800 border-zinc-700 text-white"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <>
              {isInitializing && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-20">
                  <RefreshCw className="w-8 h-8 text-accent animate-spin" />
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {!isInitializing && (
                <div className="absolute inset-10 border-2 border-white/20 rounded-lg pointer-events-none z-10">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-accent rounded-tl-sm" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-accent rounded-tr-sm" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-accent rounded-bl-sm" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-accent rounded-br-sm" />
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-6 bg-zinc-900/90 flex items-center justify-between gap-4">
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10 rounded-full h-12 w-12">
            <X className="w-6 h-6" />
          </Button>
          
          <button 
            onClick={handleCapture}
            disabled={!!error || isInitializing}
            className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-white transition-all active:scale-90 disabled:opacity-20"
            aria-label="Capture Photo"
          >
            <div className="w-12 h-12 rounded-full border-2 border-black flex items-center justify-center">
               <Circle className="w-8 h-8 text-black fill-black" />
            </div>
          </button>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleCamera} 
            disabled={isInitializing || !!error}
            className="text-white hover:bg-white/10 rounded-full h-12 w-12"
          >
            <RefreshCw className="w-6 h-6" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
