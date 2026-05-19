
'use server';
/**
 * @fileOverview This file defines a Genkit flow for extracting trip card data from an image.
 *
 * - extractTripCardData - A function that handles the trip card data extraction process.
 * - ExtractTripCardDataInput - The input type for the extractTripCardData function.
 * - ExtractTripCardDataOutput - The return type for the extractTripCardData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

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
  doorNo: z.string().describe("The vehicle's door number."),
  shift: z.enum(['A', 'B', 'C']).describe("The normalized shift (A, B, or C)."),
  metrics: z
    .object({
      startingKM: z.number().describe("The starting kilometer reading."),
      endingKM: z.number().describe("The ending kilometer reading."),
      startingHMR: z.number().describe("The starting hour meter reading."),
      closingHMR: z.number().describe("The closing hour meter reading."),
    })
    .describe("Key metrics from the trip card."),
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
  model: 'googleai/gemini-1.5-flash',
  input: { schema: ExtractTripCardDataInputSchema },
  output: { schema: ExtractTripCardDataOutputSchema },
  prompt: `You are an expert OCR and data extraction agent specialized in processing trip card images.
Your task is to analyze the provided trip card image and extract specific information into a JSON object.

Output MUST be a JSON object conforming to the following structure:
{{jsonSchema output.schema}}

Specific instructions:
1. Operator Name: Extract the operator's name. If written in Hindi, translate it to English.
2. Door No: Identify the vehicle number and assign it to 'doorNo'.
3. Shift: Normalize 1/I/A to 'A', 2/II/B to 'B', 3/III/C to 'C'.
4. Metrics: Extract 'Starting KM', 'Ending KM', 'Starting Hour (HMR)', and 'Closing Hour (HMR)' as numbers.
5. PC Tally: Count total trips for each standardized PC ID. 
   Standardized IDs: V-06, V-08, V-09, V-10, V-11, V-42, V-43, V-44, V-45, T-15, T-16, T-17, S-18, S-19, S-20, S-24, V-25, V-26, V-27, V-28, V-29.

Trip Card Image: {{media url=tripCardImage}}`,
});

const extractTripCardDataFlow = ai.defineFlow(
  {
    name: 'extractTripCardDataFlow',
    inputSchema: ExtractTripCardDataInputSchema,
    outputSchema: ExtractTripCardDataOutputSchema,
  },
  async (input) => {
    const { output } = await extractTripCardDataPrompt(input);
    if (!output) {
      throw new Error('Failed to extract trip card data. The model returned no output.');
    }
    return output;
  }
);
