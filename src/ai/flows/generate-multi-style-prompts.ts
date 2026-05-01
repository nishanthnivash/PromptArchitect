'use server';
/**
 * @fileOverview This file implements a Genkit flow that takes a raw user thought
 * and generates four distinct prompt styles: Persona, Chain-of-Thought, Minimalist,
 * and Creative. It helps users quickly find an effective prompt for their needs.
 *
 * - generateMultiStylePrompts - The main function to generate prompts.
 * - RawThoughtInput - The input type for the generateMultiStylePrompts function.
 * - GenerateMultiStylePromptsOutput - The return type for the generateMultiStylePrompts function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RawThoughtInputSchema = z.object({
  rawThought: z.string().describe('The user\u0027s initial idea or raw thought.'),
});
export type RawThoughtInput = z.infer<typeof RawThoughtInputSchema>;

const GenerateMultiStylePromptsOutputSchema = z.object({
  personaApproachPrompt: z
    .string()
    .describe(
      'A prompt generated with a specific persona for the AI to adopt (e.g., \u0022Act as a [role] with [experience]...\u0022).'
    ),
  chainOfThoughtApproachPrompt: z
    .string()
    .describe(
      'A prompt that guides the AI through a step-by-step thinking process to achieve the goal (e.g., \u0022Break down the steps for...\u0022).'
    ),
  minimalistDirectApproachPrompt: z
    .string()
    .describe('A concise, direct, and straightforward prompt (e.g., \u0022Draft a concise, 3-sentence summary...\u0022).'),
  creativeBrainstormingApproachPrompt: z
    .string()
    .describe('A prompt that encourages creative thinking, brainstorming, or unique angles (e.g., \u0022Give me 5 unique angles for...\u0022).'),
});
export type GenerateMultiStylePromptsOutput = z.infer<
  typeof GenerateMultiStylePromptsOutputSchema
>;

export async function generateMultiStylePrompts(
  input: RawThoughtInput
): Promise<GenerateMultiStylePromptsOutput> {
  return generateMultiStylePromptsFlow(input);
}

const generateMultiStylePromptsPrompt = ai.definePrompt({
  name: 'generateMultiStylePromptsPrompt',
  input: { schema: RawThoughtInputSchema },
  output: { schema: GenerateMultiStylePromptsOutputSchema },
  prompt: `You are a highly skilled Prompt Architect AI.
Your task is to analyze a raw user thought and generate four distinct prompt variations based on it.
These variations should help the user quickly refine their initial idea into an effective prompt for another AI model.

Raw User Thought: {{{rawThought}}}

Based on the raw thought, consider the intent, potential personas, and target audience, then generate the following four prompt styles:

1.  **The Persona Approach:** Create a prompt that instructs an AI to adopt a specific role or persona with relevant experience to address the raw thought.
2.  **The Chain-of-Thought Approach:** Create a prompt that guides an AI to break down the problem or task from the raw thought into sequential steps, encouraging detailed reasoning.
3.  **The Minimalist/Direct Approach:** Create a very concise, direct, and straightforward prompt that gets straight to the point of the raw thought, aiming for efficiency and brevity.
4.  **The Creative/Brainstorming Approach:** Create a prompt that encourages an AI to think outside the box, generate multiple unique angles, or explore diverse possibilities related to the raw thought.

Ensure each generated prompt is self-contained and clearly addresses the original raw thought from its specific stylistic angle.

`,
});

const generateMultiStylePromptsFlow = ai.defineFlow(
  {
    name: 'generateMultiStylePromptsFlow',
    inputSchema: RawThoughtInputSchema,
    outputSchema: GenerateMultiStylePromptsOutputSchema,
  },
  async (input) => {
    const { output } = await generateMultiStylePromptsPrompt(input);
    return output!;
  }
);
