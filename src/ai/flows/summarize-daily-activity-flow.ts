
'use server';
/**
 * @fileOverview An AI agent to summarize daily labor activities.
 *
 * - summarizeDailyActivity - A function that handles the daily activity summarization.
 * - SummarizeDailyActivityInput - The input type for the summarizeDailyActivity function.
 * - SummarizeDailyActivityOutput - The return type for the summarizeDailyActivity function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DailyEntryForSummarySchema = z.object({
  laborerName: z.string().describe('The name of the laborer.'),
  isPresent: z.boolean().describe('Whether the laborer was present or absent.'),
  workDetails: z.string().optional().describe('Details of the work performed by the laborer if present, or "Absent".'),
  advancePaid: z.number().describe('The amount of advance paid to the laborer on this day.'),
});
export type DailyEntryForSummary = z.infer<typeof DailyEntryForSummarySchema>;

const SummarizeDailyActivityInputSchema = z.object({
  date: z.string().describe('The date for which the activity is being summarized (e.g., YYYY-MM-DD).'),
  entries: z.array(DailyEntryForSummarySchema).describe('A list of daily entries for the specified date.'),
});
export type SummarizeDailyActivityInput = z.infer<typeof SummarizeDailyActivityInputSchema>;

const SummarizeDailyActivityOutputSchema = z.object({
  summary: z.string().describe('A concise natural language summary of the daily labor activity.'),
});
export type SummarizeDailyActivityOutput = z.infer<typeof SummarizeDailyActivityOutputSchema>;

export async function summarizeDailyActivity(input: SummarizeDailyActivityInput): Promise<SummarizeDailyActivityOutput> {
  return summarizeDailyActivityFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeDailyActivityPrompt',
  input: {schema: SummarizeDailyActivityInputSchema},
  output: {schema: SummarizeDailyActivityOutputSchema},
  prompt: `You are an expert assistant for a construction site manager. Your task is to summarize the daily labor activity based on the provided entries for the date: {{{date}}}.

Focus on:
- Total number of laborers present and absent.
- A brief overview of the types of work done by present laborers.
- The total amount of advance paid out for the day.
- Any other notable observations (e.g., if all laborers were absent, or if specific critical tasks were mentioned).

Keep the summary concise and informative.

Daily Entries:
{{#if entries.length}}
{{#each entries}}
- Laborer: {{this.laborerName}}
  Status: {{#if this.isPresent}}Present{{else}}Absent{{/if}}
  {{#if this.isPresent}}
  Work Details: {{this.workDetails}}
  {{/if}}
  Advance Paid: ₹{{this.advancePaid}}
{{/each}}
{{else}}
No entries provided for this date.
{{/if}}

Based on these entries, provide your summary.
`,
});

const summarizeDailyActivityFlow = ai.defineFlow(
  {
    name: 'summarizeDailyActivityFlow',
    inputSchema: SummarizeDailyActivityInputSchema,
    outputSchema: SummarizeDailyActivityOutputSchema,
  },
  async (input) => {
    // Basic validation or preprocessing if needed
    if (input.entries.length === 0) {
      return { summary: `No labor activity recorded for ${input.date}.` };
    }

    const {output} = await prompt(input);
    if (!output) {
        throw new Error('The AI model did not return a summary.');
    }
    return output;
  }
);
