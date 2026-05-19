'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Truck, Clock, Gauge, Database, CheckCircle2, RefreshCw, FileSpreadsheet, ChevronRight, Camera, AlertCircle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { processTripCardAction, syncToSheetsAction } from '@/app/actions/sync-action';
import type { ActionState } from '@/app/actions/types';
import type { ExtractTripCardDataOutput } from '@/ai/flows/extract-trip-card-data-flow';
import { CameraModule } from '@/components/CameraModule';
import { TallyDisplay } from '@/components/TallyDisplay';

/**
 * Compresses a base64 image string client-side.
 */
async function compressImage(base64Str: string, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error("Canvas context failed"));
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = (e) => {
      console.error("Image loading error for compression:", e);
      reject(new Error("Failed to load image for compression"));
    };
  });
}

export default function Dashboard() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [step, setStep] = useState(1);
  const [extractionData, setExtractionData] = useState<ActionState | null>(null);
  const [editedData, setEditedData] = useState<ExtractTripCardDataOutput | null>(null);
  const [sheetId, setSheetId] = useState('1bBNw90cRw1MURyXiHdxmY9e0JIxgyOToX4XFrF2rY5w');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      setAppError(null);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(reader.result as string);
          setImage(compressed);
          setExtractionData(null);
          setEditedData(null);
          setStep(1);
        } catch (err) {
          setImage(reader.result as string);
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = async (base64Image: string) => {
    setLoading(true);
    setAppError(null);
    try {
      const compressed = await compressImage(base64Image);
      setImage(compressed);
      setExtractionData(null);
      setEditedData(null);
      setStep(1);
    } catch (err) {
      setImage(base64Image);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!image) {
      setAppError("Please upload or scan an image first.");
      return;
    }
    setLoading(true);
    setAppError(null);
    
    try {
      const res = await processTripCardAction(image);
      if (!res.success) {
        setAppError(`Extraction Error: ${res.message}`);
      } else {
        setExtractionData(res);
        setEditedData(res.data || null);
        setStep(2);
      }
    } catch (err: any) {
      setAppError(err.message || "An unexpected error occurred during AI processing.");
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    if (!editedData) return;
    
    setEditedData(prev => {
      if (!prev) return null;
      
      const newData = { ...prev };
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        (newData as any)[parent] = {
          ...(newData as any)[parent],
          [child]: value
        };
      } else {
        (newData as any)[field] = value;
      }
      return newData;
    });
  };

  const handleTallyChange = (pc: string, value: number) => {
    if (!editedData) return;
    setEditedData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        pcTally: {
          ...prev.pcTally,
          [pc]: value
        }
      };
    });
  };

  const handleSync = async () => {
    if (!editedData || !sheetId) {
      setAppError("Please provide a valid Spreadsheet ID and ensure data is loaded.");
      return;
    }
    setSyncing(true);
    setAppError(null);
    try {
      const res = await syncToSheetsAction(sheetId, editedData);
      if (!res.success) {
        setAppError(`Sync Error: ${res.message}`);
      } else {
        setStep(3);
        setExtractionData(prev => prev ? { ...prev, syncResult: res.syncResult } : null);
      }
    } catch (err: any) {
      setAppError(err.message || "An error occurred during synchronization.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl p-6 lg:p-12 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-8">
        <div>
          <h1 className="text-4xl font-headline font-bold text-primary flex items-center gap-3">
            <Truck className="w-10 h-10 text-accent" strokeWidth={1.5} />
            ShiftStream <span className="text-foreground">OCR</span>
          </h1>
          <p className="text-muted-foreground mt-2 font-medium max-w-lg">
            Industrial intelligence for automated trip card extraction and dynamic spreadsheet synchronization.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-secondary/50 p-1 rounded-lg border border-border self-start">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex items-center justify-center w-8 h-8 rounded-md transition-all ${
                step === s ? 'bg-accent text-accent-foreground shadow-lg' : 'text-muted-foreground'
              }`}
            >
              {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
            </div>
          ))}
        </div>
      </header>

      {appError && (
        <Alert variant="destructive" className="animate-in slide-in-from-top-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Operation Failed</AlertTitle>
          <AlertDescription>{appError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-card shadow-2xl border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-headline">Trip Card Input</CardTitle>
              <CardDescription>Upload or scan a photo of the card.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Button 
                  variant="outline" 
                  className="h-20 flex-col gap-1 border-dashed"
                  onClick={() => setIsCameraOpen(true)}
                  disabled={loading}
                >
                  <Camera className="w-5 h-5" />
                  <span className="text-xs">Scan Camera</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex-col gap-1 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-xs">Upload File</span>
                </Button>
              </div>

              <div 
                className={`relative border-2 border-dashed rounded-xl transition-all duration-300 flex flex-col items-center justify-center p-8 cursor-pointer overflow-hidden min-h-[160px] ${
                  image ? 'border-accent bg-accent/5' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => !image && !loading && fileInputRef.current?.click()}
              >
                {image ? (
                  <img src={image} alt="Trip Card Preview" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                ) : (
                  <>
                    <Database className="w-10 h-10 mb-3 text-muted-foreground" />
                    <span className="text-sm font-medium text-center px-4 text-muted-foreground">
                      No image selected
                    </span>
                  </>
                )}
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {image && step === 1 && (
                <Button 
                  className="w-full h-12 text-md font-bold transition-all shadow-lg hover:shadow-primary/20"
                  onClick={handleProcess}
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Database className="w-5 h-5 mr-2" />
                  )}
                  {loading ? 'Processing OCR...' : 'Extract Data'}
                </Button>
              )}

              {editedData && step >= 2 && (
                <div className="pt-4 border-t space-y-4 animate-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <Label htmlFor="sheetId" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Target Google Sheet ID
                    </Label>
                    <div className="relative">
                      <FileSpreadsheet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="sheetId"
                        placeholder="Paste Spreadsheet ID..."
                        className="pl-10 font-mono text-xs"
                        value={sheetId}
                        onChange={(e) => setSheetId(e.target.value)}
                        disabled={syncing || step === 3}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    className={`w-full h-12 font-bold shadow-xl transition-all ${
                      step === 3 ? 'bg-green-600 hover:bg-green-700' : 'bg-primary'
                    }`}
                    onClick={handleSync}
                    disabled={syncing || step === 3}
                  >
                    {syncing ? (
                      <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                    ) : step === 3 ? (
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                    ) : (
                      <ChevronRight className="w-5 h-5 mr-2" />
                    )}
                    {syncing ? 'Syncing...' : step === 3 ? 'Sync Complete' : 'Commit to Spreadsheet'}
                  </Button>
                  
                  {step === 2 && (
                    <Button variant="ghost" size="sm" className="w-full text-xs opacity-50" onClick={() => { setStep(1); setEditedData(null); }}>
                      Rescan / Change Image
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {step === 3 && extractionData?.syncResult && (
            <Card className="bg-accent/10 border-accent/30 overflow-hidden animate-in zoom-in-95 duration-500">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-accent rounded-full text-accent-foreground shadow-lg">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold">Sync Successful</p>
                  <p className="text-xs text-muted-foreground">
                    Shift Tab: <span className="font-mono font-bold text-accent">{extractionData.syncResult.shiftTab}</span><br />
                    Target Row: <span className="font-mono font-bold text-accent">{extractionData.syncResult.targetRow}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-8 space-y-8">
          {editedData ? (
            <div className="space-y-8 animate-in slide-in-from-right duration-500">
              {/* Header Info Edit */}
              <Card className="bg-card border-border overflow-hidden">
                <CardHeader className="bg-secondary/30 pb-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-md font-headline">Review & Edit Extraction</CardTitle>
                      <CardDescription>Correct any misread text before committing to sheets.</CardDescription>
                    </div>
                    <Clock className="w-6 h-6 text-accent opacity-50" />
                  </div>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Operator Name</Label>
                    <Input 
                      value={editedData.operatorName} 
                      onChange={(e) => handleFieldChange('operatorName', e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Door No</Label>
                    <Input 
                      value={editedData.doorNo} 
                      onChange={(e) => handleFieldChange('doorNo', e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Shift</Label>
                    <Select value={editedData.shift} onValueChange={(val) => handleFieldChange('shift', val)}>
                      <SelectTrigger className="bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Shift A</SelectItem>
                        <SelectItem value="B">Shift B</SelectItem>
                        <SelectItem value="C">Shift C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Metrics Edit */}
              <Card className="bg-card border-border overflow-hidden">
                <CardHeader className="bg-secondary/30 pb-4 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-md font-headline">Operational Metrics</CardTitle>
                    <Gauge className="w-6 h-6 text-accent opacity-50" />
                  </div>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Start HMR</Label>
                    <Input 
                      type="number"
                      value={editedData.metrics.startingHMR} 
                      onChange={(e) => handleFieldChange('metrics.startingHMR', Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-accent uppercase tracking-widest">Close HMR</Label>
                    <Input 
                      type="number"
                      value={editedData.metrics.closingHMR} 
                      onChange={(e) => handleFieldChange('metrics.closingHMR', Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Start KM</Label>
                    <Input 
                      type="number"
                      value={editedData.metrics.startingKM} 
                      onChange={(e) => handleFieldChange('metrics.startingKM', Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-accent uppercase tracking-widest">Close KM</Label>
                    <Input 
                      type="number"
                      value={editedData.metrics.endingKM} 
                      onChange={(e) => handleFieldChange('metrics.endingKM', Number(e.target.value))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Tally Edit */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">Fuzzy PC Tally Report</h3>
                  <div className="h-px flex-1 bg-border" />
                </div>
                
                <Card className="bg-card border-border overflow-hidden">
                  <CardContent className="p-0">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-6">
                      {Object.entries(editedData.pcTally).map(([pc, count]) => (
                        <div key={pc} className="space-y-2 p-3 bg-secondary/20 rounded-lg border border-border/50">
                          <Label className="text-[10px] font-bold uppercase opacity-70">{pc}</Label>
                          <Input 
                            type="number" 
                            size={1}
                            value={count} 
                            onChange={(e) => handleTallyChange(pc, Number(e.target.value))}
                            className="h-8 text-center font-mono font-bold text-accent"
                          />
                        </div>
                      ))}
                      {Object.keys(editedData.pcTally).length === 0 && (
                        <div className="col-span-full py-8 text-center text-muted-foreground opacity-50">
                          No PC trips identified.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 bg-secondary/10 rounded-3xl border-2 border-dashed border-border opacity-50">
              <div className="p-6 rounded-full bg-secondary/30 mb-6">
                <Database className="w-12 h-12 text-muted-foreground" strokeWidth={1} />
              </div>
              <h3 className="text-xl font-headline font-medium">Ready for Extraction</h3>
              <p className="text-muted-foreground mt-2 max-w-sm">
                Upload or scan a trip card image to begin the intelligent data extraction process.
              </p>
            </div>
          )}
        </div>
      </div>

      <CameraModule 
        isOpen={isCameraOpen} 
        onClose={() => setIsCameraOpen(false)} 
        onCapture={handleCameraCapture} 
      />

      {loading && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="max-w-md w-full px-8 space-y-6">
            <div className="relative flex justify-center">
              <RefreshCw className="w-12 h-12 text-accent animate-spin" />
              <Truck className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-headline font-bold">Processing...</h2>
              <p className="text-muted-foreground">Gemini 2.5 Flash is analyzing handwriting and extracting operational data.</p>
            </div>
            <Progress value={undefined} className="h-1 bg-secondary" />
          </div>
        </div>
      )}
    </div>
  );
}
