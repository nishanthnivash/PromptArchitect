
'use server';
/**
 * @fileOverview This file implements a Genkit flow that takes a raw user thought
 * and generates multiple distinct prompt styles with scoring and intent detection.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PromptScoreSchema = z.object({
  clarity: z.number().min(0).max(100).describe('Score for how clear the prompt is.'),
  specificity: z.number().min(0).max(100).describe('Score for how specific the instructions are.'),
  quality: z.number().min(0).max(100).describe('Overall output quality expectation score.'),
});

const PromptVariationSchema = z.object({
  style: z.string().describe('The name of the style (e.g., Persona, Technical, Marketing).'),
  content: z.string().describe('The actual prompt text.'),
  scores: PromptScoreSchema,
  reasoning: z.string().describe('A brief explanation of why this style was chosen and why it scored this way.'),
});

const RawThoughtInputSchema = z.object({
  rawThought: z.string().describe('The user\'s initial idea or raw thought.'),
});
export type RawThoughtInput = z.infer<typeof RawThoughtInputSchema>;

const GenerateMultiStylePromptsOutputSchema = z.object({
  detectedIntent: z.string().describe('The AI\'s interpretation of what the user wants to achieve.'),
  prompts: z.array(PromptVariationSchema).describe('The list of architected prompt variations.'),
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
Your task is to analyze a raw user thought and generate four distinct prompt variations.
For each variation, you must also provide scores (0-100) for Clarity, Specificity, and Expected Quality.

Raw User Thought: {{{rawThought}}}

1. Detect the user's intent and describe it concisely (e.g., "Drafting a professional apology email").
2. Generate 4 variations:
   - **Persona Approach**: Expert role-play.
   - **Chain-of-Thought**: Step-by-step reasoning.
   - **Technical/Coding**: Structured for code or logical precision.
   - **Marketing/Sales**: Optimized for engagement and persuasion.

For each, explain your reasoning and provide scores.`,
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
