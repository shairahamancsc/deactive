'use server';

/**
 * @fileOverview A work description analyzer AI agent.
 *
 * - analyzeWorkDescriptions - A function that handles the analysis of work descriptions.
 * - AnalyzeWorkDescriptionsInput - The input type for the analyzeWorkDescriptions function.
 * - AnalyzeWorkDescriptionsOutput - The return type for the analyzeWorkDescriptions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeWorkDescriptionsInputSchema = z.object({
  workDescriptions: z
    .string()
    .describe('A comma separated string of work descriptions to analyze.'),
});
export type AnalyzeWorkDescriptionsInput = z.infer<typeof AnalyzeWorkDescriptionsInputSchema>;

const AnalyzeWorkDescriptionsOutputSchema = z.object({
  materialEstimates: z
    .string()
    .describe('A summary of commonly used material quantities for different tasks.'),
});
export type AnalyzeWorkDescriptionsOutput = z.infer<typeof AnalyzeWorkDescriptionsOutputSchema>;

export async function analyzeWorkDescriptions(
  input: AnalyzeWorkDescriptionsInput
): Promise<AnalyzeWorkDescriptionsOutput> {
  return analyzeWorkDescriptionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeWorkDescriptionsPrompt',
  input: {schema: AnalyzeWorkDescriptionsInputSchema},
  output: {schema: AnalyzeWorkDescriptionsOutputSchema},
  prompt: `You are an expert construction foreman specializing in estimating material quantities for different tasks.

You will be provided with a comma separated string of work descriptions. You will analyze these descriptions and extract commonly used material quantities for different tasks.

Work Descriptions: {{{workDescriptions}}}

Output a summary of commonly used material quantities for different tasks. Focus on identifying the types and quantities of materials typically used for each task described in the work descriptions.
`,
});

const analyzeWorkDescriptionsFlow = ai.defineFlow(
  {
    name: 'analyzeWorkDescriptionsFlow',
    inputSchema: AnalyzeWorkDescriptionsInputSchema,
    outputSchema: AnalyzeWorkDescriptionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
