
'use server';
/**
 * @fileOverview This file implements a Genkit flow that takes a raw user thought
 * and generates multiple distinct prompt styles with scoring and intent detection.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PromptScoreSchema = z.object({
  clarity: z.number().min(0).max(100).describe('Score for how clear the prompt is.'),
  clarityReasoning: z.string().describe('One-line explanation for the clarity score.'),
  specificity: z.number().min(0).max(100).describe('Score for how specific the instructions are.'),
  specificityReasoning: z.string().describe('One-line explanation for the specificity score.'),
  quality: z.number().min(0).max(100).describe('Overall output quality expectation score.'),
  qualityReasoning: z.string().describe('One-line explanation for the quality score.'),
});

const PromptVariationSchema = z.object({
  style: z.string().describe('The name of the style (e.g., Persona Approach, Technical/Coding).'),
  content: z.string().describe('The actual prompt text.'),
  scores: PromptScoreSchema,
  reasoning: z.string().describe('A brief explanation of why this style was chosen.'),
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

Raw User Thought: {{{rawThought}}}

1. Detect the user's intent and describe it concisely (e.g., "Drafting a professional apology email").
2. Generate 4 variations:
   - **Persona Approach**: Expert role-play.
   - **Chain-of-Thought**: Step-by-step reasoning.
   - **Technical/Coding**: Structured for code or logical precision.
   - **Marketing/Sales**: Optimized for engagement and persuasion.

For each variation, you must also provide:
- Scores (0-100) for Clarity, Specificity, and Expected Quality.
- A one-line explanation for each score explaining why it earned that number.
- Overall reasoning for the chosen style.`,
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

// Flow for regenerating a single style
const RegenerateStyleInputSchema = z.object({
  rawThought: z.string(),
  style: z.string(),
});
export type RegenerateStyleInput = z.infer<typeof RegenerateStyleInputSchema>;

export async function regenerateStylePrompt(input: RegenerateStyleInput): Promise<z.infer<typeof PromptVariationSchema>> {
  return regenerateStyleFlow(input);
}

const regenerateStylePromptDef = ai.definePrompt({
  name: 'regenerateStylePromptDef',
  input: { schema: RegenerateStyleInputSchema },
  output: { schema: PromptVariationSchema },
  prompt: `Regenerate a high-performance prompt variation for the following raw thought in the specific style: "{{style}}".

Raw Thought: {{{rawThought}}}

Provide detailed scores and one-line reasonings for each score.`,
});

const regenerateStyleFlow = ai.defineFlow(
  {
    name: 'regenerateStyleFlow',
    inputSchema: RegenerateStyleInputSchema,
    outputSchema: PromptVariationSchema,
  },
  async (input) => {
    const { output } = await regenerateStylePromptDef(input);
    return output!;
  }
);
