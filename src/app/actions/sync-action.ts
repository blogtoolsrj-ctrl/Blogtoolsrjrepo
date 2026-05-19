'use server';

import { extractTripCardData } from '@/ai/flows/extract-trip-card-data-flow';
import { syncTripDataToSheets } from '@/lib/google-sheets';
import type { ActionState } from './types';
import type { ExtractTripCardDataOutput } from '@/ai/flows/extract-trip-card-data-flow';

export async function processTripCardAction(base64Image: string): Promise<ActionState> {
  try {
    const data = await extractTripCardData({ tripCardImage: base64Image });
    return {
      success: true,
      message: 'Data extracted successfully.',
      data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to extract trip card data.',
    };
  }
}

export async function syncToSheetsAction(
  spreadsheetId: string,
  data: ExtractTripCardDataOutput
): Promise<ActionState> {
  try {
    const result = await syncTripDataToSheets(spreadsheetId, data);
    return {
      success: true,
      message: 'Successfully synchronized with Google Sheets.',
      syncResult: result,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to sync with Google Sheets.',
    };
  }
}
