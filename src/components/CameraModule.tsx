'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, X, RefreshCw, Circle } from 'lucide-react';
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
      stream.getTracks().forEach(track => track.stop());
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

      // Sequential fallback constraints
      const constraintSets: MediaStreamConstraints[] = [
        { video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } } },
        { video: { facingMode: facingMode } },
        { video: true } // Ultimate fallback: just any video device
      ];

      let newStream: MediaStream | null = null;
      let lastError: any = null;

      for (const constraints of constraintSets) {
        try {
          newStream = await navigator.mediaDevices.getUserMedia(constraints);
          if (newStream) break;
        } catch (e) {
          lastError = e;
          console.warn("Camera constraint set failed, trying fallback...", constraints, e);
        }
      }

      if (!newStream) {
        throw lastError || new Error("Could not find any available camera device.");
      }

      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: any) {
      console.error("Final camera access error:", err);
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError("No camera device was found on this system.");
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Camera access was denied. Please check your browser permissions.");
      } else {
        setError(`Camera Error: ${err.message || "Unknown error"}`);
      }
    } finally {
      setIsInitializing(false);
    }
  }, [facingMode, stream, isInitializing]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Ensure we have valid dimensions
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      
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
  };

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
    // Restart camera with new facing mode
    stopCamera();
    setTimeout(() => startCamera(), 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl bg-black border-zinc-800 p-0 overflow-hidden">
        <DialogHeader className="p-4 bg-zinc-900/50 absolute top-0 left-0 right-0 z-10 backdrop-blur-md">
          <DialogTitle className="text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-accent" />
            Scan Trip Card
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {isInitializing ? "Starting camera..." : "Align the card within the frame."}
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-[4/3] bg-black flex items-center justify-center">
          {error ? (
            <div className="p-8 text-center space-y-4">
              <p className="text-destructive font-medium text-sm">{error}</p>
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
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {!isInitializing && (
                <div className="absolute inset-8 border-2 border-white/20 rounded-lg pointer-events-none">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-accent rounded-tl-sm" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-accent rounded-tr-sm" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-accent rounded-bl-sm" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-accent rounded-br-sm" />
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-6 bg-zinc-900/80 flex items-center justify-between gap-4">
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10">
            <X className="w-6 h-6" />
          </Button>
          
          <button 
            onClick={handleCapture}
            disabled={!!error || isInitializing}
            className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-white transition-transform active:scale-90 disabled:opacity-30"
          >
            <Circle className="w-12 h-12 text-black fill-black" strokeWidth={1} />
            <div className="absolute inset-0 rounded-full border-4 border-accent scale-110 group-hover:scale-125 transition-transform opacity-20" />
          </button>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleCamera} 
            disabled={isInitializing}
            className="text-white hover:bg-white/10"
          >
            <RefreshCw className="w-6 h-6" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
