import { ExtractTripCardDataOutput } from '@/ai/flows/extract-trip-card-data-flow';

export type ActionState = {
  success: boolean;
  message: string;
  data?: ExtractTripCardDataOutput;
  syncResult?: { targetRow: number; shiftTab: string };
};
