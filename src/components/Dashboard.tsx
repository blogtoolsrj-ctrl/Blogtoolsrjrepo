'use client';

import React, { useState, useRef } from 'react';
import { Upload, Truck, Clock, Gauge, Database, CheckCircle2, AlertCircle, RefreshCw, FileSpreadsheet, ChevronRight, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { processTripCardAction, syncToSheetsAction } from '@/app/actions/sync-action';
import type { ActionState } from '@/app/actions/types';
import { MetricCard } from '@/components/MetricCard';
import { TallyDisplay } from '@/components/TallyDisplay';
import { CameraModule } from '@/components/CameraModule';

export default function Dashboard() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [step, setStep] = useState(1);
  const [extractionData, setExtractionData] = useState<ActionState | null>(null);
  const [sheetId, setSheetId] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setExtractionData(null);
        setStep(1);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = (base64Image: string) => {
    setImage(base64Image);
    setExtractionData(null);
    setStep(1);
  };

  const handleProcess = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const res = await processTripCardAction(image);
      if (!res.success) {
        window.alert(res.message);
      } else {
        setExtractionData(res);
        setStep(2);
      }
    } catch (err: any) {
      window.alert(err.message || "An unexpected error occurred during OCR.");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!extractionData?.data || !sheetId) {
      window.alert("Please provide a valid Spreadsheet ID.");
      return;
    }
    setSyncing(true);
    try {
      const res = await syncToSheetsAction(sheetId, extractionData.data);
      if (!res.success) {
        window.alert(`Sync Error: ${res.message}`);
      } else {
        setStep(3);
        setExtractionData(prev => prev ? { ...prev, syncResult: res.syncResult } : null);
      }
    } catch (err: any) {
      window.alert(err.message || "An error occurred during synchronization.");
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Upload & Sync Configuration */}
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
                >
                  <Camera className="w-5 h-5" />
                  <span className="text-xs">Scan Camera</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex-col gap-1 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-xs">Upload File</span>
                </Button>
              </div>

              <div 
                className={`relative border-2 border-dashed rounded-xl transition-all duration-300 flex flex-col items-center justify-center p-8 cursor-pointer overflow-hidden min-h-[160px] ${
                  image ? 'border-accent bg-accent/5' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => !image && fileInputRef.current?.click()}
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

              {extractionData && step >= 2 && (
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

        {/* Right Column: Results View */}
        <div className="lg:col-span-8 space-y-8">
          {extractionData?.data ? (
            <div className="space-y-8 animate-in slide-in-from-right duration-500">
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard 
                  label="Operator Name" 
                  value={extractionData.data.operatorName} 
                  icon={Clock} 
                  subLabel="Extracted & Translated"
                />
                <MetricCard 
                  label="Door Number" 
                  value={extractionData.data.doorNo} 
                  icon={Truck} 
                  subLabel="Vehicle Identification"
                />
                <MetricCard 
                  label="Shift" 
                  value={extractionData.data.shift} 
                  icon={Clock} 
                  subLabel="Work Cycle Normalization"
                />
              </div>

              {/* Numerical Metrics */}
              <Card className="bg-card border-border overflow-hidden">
                <CardHeader className="bg-secondary/30 pb-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-md font-headline">Operational Metrics</CardTitle>
                      <CardDescription>HMR and Kilometer readings extracted from card.</CardDescription>
                    </div>
                    <Gauge className="w-6 h-6 text-accent opacity-50" />
                  </div>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Start HMR</p>
                    <p className="text-2xl font-headline font-bold">{extractionData.data.metrics.startingHMR}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-accent">Close HMR</p>
                    <p className="text-2xl font-headline font-bold text-accent">{extractionData.data.metrics.closingHMR}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Start KM</p>
                    <p className="text-2xl font-headline font-bold">{extractionData.data.metrics.startingKM}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-accent">Close KM</p>
                    <p className="text-2xl font-headline font-bold text-accent">{extractionData.data.metrics.endingKM}</p>
                  </div>
                </CardContent>
              </Card>

              {/* PC Tally Tool */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">Fuzzy PC Tally Report</h3>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <TallyDisplay tally={extractionData.data.pcTally} />
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
              <h2 className="text-2xl font-headline font-bold">Intelligent Extraction in Progress</h2>
              <p className="text-muted-foreground">Gemini 1.5 Flash is analyzing handwriting and translating Hindi operators...</p>
            </div>
            <Progress value={undefined} className="h-1 bg-secondary" />
          </div>
        </div>
      )}
    </div>
  );
}
