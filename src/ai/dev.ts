'use server';
import { config } from 'dotenv';
config(); // Load environment variables from .env file FIRST.

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error(
    'GEMINI_API_KEY is not defined. Please set it in your .env file.'
  );
}

// Configure and export the 'ai' object from this central file.
export const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
  model: 'googleai/gemini-2.5-flash',
});

// Now, import the flows which will use the configured 'ai' object.
import '@/ai/flows/generate-financial-insights.ts';
