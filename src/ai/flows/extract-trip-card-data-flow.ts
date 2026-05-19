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
  input: { schema: ExtractTripCardDataInputSchema },
  output: { schema: ExtractTripCardDataOutputSchema },
  prompt: `You are an expert OCR and data extraction agent specialized in processing trip card images.
Your task is to analyze the provided trip card image and extract specific information into a JSON object.
Ensure that all extracted numerical values are returned as numbers, and text values as strings.

Output MUST be a JSON object conforming to the following structure:
\
{{jsonSchema output.schema}}
\

Here are the specific instructions for each field:

1.  **Operator Name**: Extract the operator's name. If the name is written in Hindi, you MUST translate it to English.
2.  **Door No**: Identify the vehicle number and assign it to 'doorNo'.
3.  **Shift**: Normalize the shift value based on the following rules:
    *   If you find '1', 'I', or 'A', normalize to "A".
    *   If you find '2', 'II', or 'B', normalize to "B".
    *   If you find '3', 'III', or 'C', normalize to "C".
    *   If no clear shift is found, try to infer it based on context.
4.  **Metrics**: Extract 'Starting KM', 'Ending KM', 'Starting Hour (HMR)', and 'Closing Hour (HMR)'. Ensure these are parsed as numerical values.
5.  **PC Tally**: Identify PC numbers and calculate the TOTAL number of trips for each unique, STANDARDIZED PC. You MUST NOT list individual trips, only the aggregate total count per PC. Apply the following fuzzy mapping rules to standardize PC names before counting:
    *   **V-06**: Accepts {6, PC 6, PC-06, PC NO 06, V-06}
    *   **V-08**: Accepts {8, PC 8, PC-8, PC NO 08, V-08}
    *   **V-09**: Accepts {9, PC 9, PC-9, PC NO 09, V-09}
    *   **V-10**: Accepts {10, PC 10, V-10}
    *   **V-11**: Accepts {11, PC 11, V-11}
    *   **V-42**: Accepts {24, PC 24, V-42}
    *   **V-43**: Accepts {43, PC 43, V-43}
    *   **V-44**: Accepts {44, PC 44, V-44}
    *   **V-45**: Accepts {45, PC 45, V-45}
    *   **T-15**: Accepts {T-15}
    *   **T-16**: Accepts {T-16}
    *   **T-17**: Accepts {T-17}
    *   **S-18**: Accepts {S-18}
    *   **S-19**: Accepts {S-19}
    *   **S-20**: Accepts {S-20}
    *   **S-24**: Accepts {S-24}
    *   **V-25**: Accepts {V-25}
    *   **V-26**: Accepts {V-26}
    *   **V-27**: Accepts {V-27}
    *   **V-28**: Accepts {V-28}
    *   **V-29**: Accepts {V-29}

Ensure all data points are extracted accurately and conform to the specified formats and rules.

Trip Card Image: {{media url=tripCardImage}}`,
});

const extractTripCardDataFlow = ai.defineFlow(
  {
    name: 'extractTripCardDataFlow',
    inputSchema: ExtractTripCardDataInputSchema,
    outputSchema: ExtractTripCardDataOutputSchema,
    // Using Gemini 1.5 Flash as requested for OCR/extraction tasks
    model: 'googleai/gemini-1.5-flash',
  },
  async (input) => {
    const { output } = await extractTripCardDataPrompt(input);
    if (!output) {
      throw new Error('Failed to extract trip card data. The model returned no output.');
    }
    return output;
  }
);
