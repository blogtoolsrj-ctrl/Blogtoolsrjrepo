'use server';
/**
 * @fileOverview This file defines a Genkit flow for extracting trip card data from an image.
 *
 * - extractTripCardData - A function that handles the trip card data extraction process.
 * - ExtractTripCardDataInput - The input type for the extractTripCardData function.
 * - ExtractTripCardDataOutput - The return type for the extractTripCardData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractTripCardDataInputSchema = z.object({
  tripCardImage: z
    .string()
    .describe(
      "A trip card image, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractTripCardDataInput = z.infer<typeof ExtractTripCardDataInputSchema>;

const ExtractTripCardDataOutputSchema = z.object({
  operatorName: z
    .string()
    .describe(
      "The name of the operator, translated to English if originally in Hindi."
    ),
  doorNo: z.string().describe("The vehicle's door number or identification number found on the card."),
  shift: z.enum(['A', 'B', 'C']).describe("The normalized shift (A, B, or C)."),
  metrics: z
    .object({
      startingKM: z.number().describe("The starting kilometer reading."),
      endingKM: z.number().describe("The ending kilometer reading."),
      startingHMR: z.number().describe("The starting hour meter reading."),
      closingHMR: z.number().describe("The closing hour meter reading."),
    })
    .describe("Key operational metrics from the trip card."),
  pcTally: z
    .record(z.string(), z.number())
    .describe(
      "A record of standardized PC names to their total trip counts. For example: {'V-06': 5, 'T-15': 2}."
    ),
});
export type ExtractTripCardDataOutput = z.infer<typeof ExtractTripCardDataOutputSchema>;

export async function extractTripCardData(
  input: ExtractTripCardDataInput
): Promise<ExtractTripCardDataOutput> {
  return extractTripCardDataFlow(input);
}

const extractTripCardDataPrompt = ai.definePrompt({
  name: 'extractTripCardDataPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: { schema: ExtractTripCardDataInputSchema },
  output: { schema: ExtractTripCardDataOutputSchema },
  prompt: `You are an expert OCR and data extraction agent specialized in processing industrial trip card images.
Your task is to analyze the provided trip card image and extract specific information into a JSON object.

Output MUST be a JSON object conforming to the following structure:
{{jsonSchema output.schema}}

Specific instructions:
1. Operator Name: Extract the operator's name. If written in Hindi, translate it to English (Roman script).
2. Door No: Identify the vehicle number (often labeled as 'Door No', 'Vehicle No', or 'Equip No') and assign it to 'doorNo'.
3. Shift: Normalize the shift identifier. 1 or I or A becomes 'A'; 2 or II or B becomes 'B'; 3 or III or C becomes 'C'.
4. Metrics: Extract 'Starting KM', 'Ending KM', 'Starting Hour (HMR)', and 'Closing Hour (HMR)'. These are numerical readings.
5. PC Tally: Look for the tally of trips for various PC units. Map these to the standardized IDs below.
   Standardized IDs: V-06, V-08, V-09, V-10, V-11, V-42, V-43, V-44, V-45, T-15, T-16, T-17, S-18, S-19, S-20, S-24, V-25, V-26, V-27, V-28, V-29.
   Count the total occurrences or trips recorded for each unit.

Trip Card Image: {{media url=tripCardImage}}`,
});

const extractTripCardDataFlow = ai.defineFlow(
  {
    name: 'extractTripCardDataFlow',
    inputSchema: ExtractTripCardDataInputSchema,
    outputSchema: ExtractTripCardDataOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await extractTripCardDataPrompt(input);
      if (!output) {
        throw new Error('The AI model returned empty data for the trip card.');
      }
      return output;
    } catch (error: any) {
      console.error("Genkit Flow Error:", error);
      throw new Error(`AI Extraction failed: ${error.message}`);
    }
  }
);
