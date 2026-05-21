/**
 * @fileOverview Complete, production-ready Genkit extraction flow.
 * Note: Excludes "use server" to permit clean schema object exports without compilation bugs.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const ExtractTripCardDataInputSchema = z.object({
  tripCardImage: z
    .string()
    .describe(
      "A trip card image, as a data URI that must include a MIME type and use Base64 encoding."
    ),
});
export type ExtractTripCardDataInput = z.infer<typeof ExtractTripCardDataInputSchema>;

export const ExtractTripCardDataOutputSchema = z.object({
  operatorName: z.string().describe("The name of the operator, translated to English if originally in Hindi."),
  doorNo: z.string().describe("The vehicle's door number or identification number found on the card."),
  shift: z.enum(['A', 'B', 'C']).describe("The normalized shift character (A, B, or C)."),
  metrics: z.object({
    startingKM: z.number().describe("The starting kilometer reading."),
    closingKM: z.number().describe("The ending kilometer reading."),
    startingHMR: z.number().describe("The starting hour meter reading."),
    closingHMR: z.number().describe("The closing hour meter reading."),
  }).describe("Key operational metrics from the trip card."),
  pcTally: z.record(z.string(), z.number()).describe(
    "A record mapping raw extracted PC identifier strings directly to their cumulative counts."
  ),
});
export type ExtractTripCardDataOutput = z.infer<typeof ExtractTripCardDataOutputSchema>;

const PromptOutputSchema = z.object({
  operatorName: z.string(),
  doorNo: z.string(),
  shift: z.enum(['A', 'B', 'C']),
  metrics: z.object({
    startingKM: z.number(),
    closingKM: z.number(),
    startingHMR: z.number(),
    closingHMR: z.number(),
  }),
  // Kept required to match your runtime loop structure perfectly
  extractedRows: z.array(
    z.object({
      pcNumber: z.string().describe("The exact text written in the PC number cell column. For ditto marks, output exactly '\"'."),
      // CHANGED TO STRING: Stops strict Zod number parsing crashes on handwritten tally strokes/marks
      tripCount: z.string().optional().describe("The trip count raw digits or tally mark counts written in this row."),
    })
  ).describe("Every distinct data row logged sequentially down the trip table log section."),
});

export const extractTripCardDataPrompt = ai.definePrompt({
  name: 'extractTripCardDataPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: { schema: ExtractTripCardDataInputSchema },
  output: { schema: PromptOutputSchema },
  prompt: `You are an expert OCR and industrial data extraction agent specialized in processing industrial trip card images.
Analyze the provided trip card image and extract specific information exactly as written.

Specific instructions:
1. Operator Name: Extract the operator's name. If written in Hindi, translate it to English.
2. Door No: Identify the vehicle number (often labeled as 'Door No', 'Vehicle No', or 'Equip No') and assign it to 'doorNo'.
3. Shift: Normalize the shift identifier. 1/I/A -> 'A'; 2/II/B -> 'B'; 3/III/C -> 'C'.
4. Metrics: Extract 'Starting KM', 'Ending KM' (or Closing KM), 'Starting Hour (HMR)', and 'Closing Hour (HMR)'.
5. PC Rows: Extract EVERY line row sequentially from top to bottom down the table log section. 
   - For 'pcNumber', look past overlapping lines, background grid rows, or marks. Extract the core digit configurations directly (e.g., if you see '24' or '42' or 'PC-90', log exactly that value). If the cell uses a clear ditto mark (", ”, “, //) or 'do', output exactly '"'.
   - For 'tripCount', extract the numeric value written. If handwritten tally strokes are used instead of digits, count the marks (a complete bundle of 4 lines with 1 cross line equals 5) and output the calculated total as a numeric string string.

Trip Card Image: {{media url=tripCardImage}}`,
});

// Helper to safely clean AI string outputs into strict numbers without breaking execution
const parseAiNumber = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === 'number') return val;
  const cleaned = val.toString().replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

export const extractTripCardDataFlow = ai.defineFlow(
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

      const pcTally: Record<string, number> = {};
      let lastKnownPc = "";

      // Safe fallback array check ensures execution never crashes if schema keys are missing
      const rows = output.extractedRows || [];

      rows.forEach((row) => {
        let currentPc = (row.pcNumber || "").trim();

        // Process sequential ditto fill maps
        if (currentPc === '"' || currentPc === '”' || currentPc === '“' || currentPc === "''" || currentPc.toLowerCase() === 'do' || currentPc === '//') {
          currentPc = lastKnownPc;
        } else if (currentPc !== "") {
          lastKnownPc = currentPc;
        }

        if (currentPc) {
          const rawCount = parseAiNumber(row.tripCount);
          // If a row is successfully parsed but the count reads as 0, default it to 1 trip
          const safeCount = rawCount > 0 ? rawCount : 1;

          pcTally[currentPc] = (pcTally[currentPc] || 0) + safeCount;
        }
      });

      return {
        operatorName: output.operatorName,
        doorNo: output.doorNo,
        shift: output.shift,
        metrics: output.metrics,
        pcTally: pcTally,
      };

    } catch (error: any) {
      console.error("Genkit Flow Error:", error);
      throw new Error(`AI Extraction failed: ${error.message}`);
    }
  }
);

/**
 * Explicit Named Export Wrapper required by sync-action.ts
 */
export async function extractTripCardData(
  input: ExtractTripCardDataInput
): Promise<ExtractTripCardDataOutput> {
  return extractTripCardDataFlow(input);
}