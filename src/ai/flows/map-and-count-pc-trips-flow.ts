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

const MapAndCountPCTripsOutputSchema = z.object({
  'V-06': z.number().describe('Total trip count for PC V-06. If not found, defaults to 0.'),
  'V-08': z.number().describe('Total trip count for PC V-08. If not found, defaults to 0.'),
  'V-09': z.number().describe('Total trip count for PC V-09. If not found, defaults to 0.'),
  'V-10': z.number().describe('Total trip count for PC V-10. If not found, defaults to 0.'),
  'V-11': z.number().describe('Total trip count for PC V-11. If not found, defaults to 0.'),
  'V-42': z.number().describe('Total trip count for PC V-42. If not found, defaults to 0.'),
  'V-43': z.number().describe('Total trip count for PC V-43. If not found, defaults to 0.'),
  'V-44': z.number().describe('Total trip count for PC V-44. If not found, defaults to 0.'),
  'V-45': z.number().describe('Total trip count for PC V-45. If not found, defaults to 0.'),
  'T-15': z.number().describe('Total trip count for PC T-15. If not found, defaults to 0.'),
  'T-16': z.number().describe('Total trip count for PC T-16. If not found, defaults to 0.'),
  'T-17': z.number().describe('Total trip count for PC T-17. If not found, defaults to 0.'),
  'S-18': z.number().describe('Total trip count for PC S-18. If not found, defaults to 0.'),
  'S-19': z.number().describe('Total trip count for PC S-19. If not found, defaults to 0.'),
  'S-20': z.number().describe('Total trip count for PC S-20. If not found, defaults to 0.'),
  'S-24': z.number().describe('Total trip count for PC S-24. If not found, defaults to 0.'),
  'V-25': z.number().describe('Total trip count for PC V-25. If not found, defaults to 0.'),
  'V-26': z.number().describe('Total trip count for PC V-26. If not found, defaults to 0.'),
  'V-27': z.number().describe('Total trip count for PC V-27. If not found, defaults to 0.'),
  'V-28': z.number().describe('Total trip count for PC V-28. If not found, defaults to 0.'),
  'V-29': z.number().describe('Total trip count for PC V-29. If not found, defaults to 0.')
}).describe('Normalized and counted PC trips.');
export type MapAndCountPCTripsOutput = z.infer<typeof MapAndCountPCTripsOutputSchema>;

const pcTallyPrompt = ai.definePrompt({
  name: 'pcTallyPrompt',
  input: { schema: MapAndCountPCTripsInputSchema },
  output: { schema: MapAndCountPCTripsOutputSchema },
  prompt: `You are an expert in parsing trip card data. Your task is to identify all mentions of PC (Payload Carrier) units from the provided raw OCR text, normalize them according to the specified rules, and then provide a total trip count for each standardized PC.
If a standardized PC is not mentioned in the text, its count in the output JSON should be 0. Do not list individual trips, only the final total count for each PC.

Here are the PC Mapping Rules for standardization and fuzzy matching:
- V-06: Recognize 