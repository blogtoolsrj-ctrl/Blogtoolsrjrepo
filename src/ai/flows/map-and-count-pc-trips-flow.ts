
'use server';
/**
 * @fileOverview A Genkit flow for extracting, normalizing, and counting PC trips from OCR text.
 *
 * - mapAndCountPCTrips - A function that handles the PC trip mapping and counting process.
 * - MapAndCountPCTripsInput - The input type for the mapAndCountPCTrips function.
 * - MapAndCountPCTripsOutput - The return type for the mapAndCountPCTrips function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MapAndCountPCTripsInputSchema = z.object({
  ocrText: z.string().describe('The raw OCR text extracted from the trip card.'),
});
export type MapAndCountPCTripsInput = z.infer<typeof MapAndCountPCTripsInputSchema>;

const MapAndCountPCTripsOutputSchema = z.record(z.string(), z.number()).describe('Normalized and counted PC trips.');
export type MapAndCountPCTripsOutput = z.infer<typeof MapAndCountPCTripsOutputSchema>;

export async function mapAndCountPCTrips(input: MapAndCountPCTripsInput): Promise<MapAndCountPCTripsOutput> {
  return mapAndCountPCTripsFlow(input);
}

const pcTallyPrompt = ai.definePrompt({
  name: 'pcTallyPrompt',
  input: { schema: MapAndCountPCTripsInputSchema },
  output: { schema: MapAndCountPCTripsOutputSchema },
  prompt: `You are an expert in parsing trip card data. Your task is to identify all mentions of PC units from the provided text, normalize them, and provide a total trip count for each standardized ID.

Standardized PCs: V-06, V-08, V-09, V-10, V-11, V-42, V-43, V-44, V-45, T-15, T-16, T-17, S-18, S-19, S-20, S-24, V-25, V-26, V-27, V-28, V-29.

Text: {{{ocrText}}}`,
});

const mapAndCountPCTripsFlow = ai.defineFlow(
  {
    name: 'mapAndCountPCTripsFlow',
    inputSchema: MapAndCountPCTripsInputSchema,
    outputSchema: MapAndCountPCTripsOutputSchema,
  },
  async (input) => {
    const { output } = await pcTallyPrompt(input);
    if (!output) throw new Error('Failed to map and count trips.');
    return output;
  }
);
