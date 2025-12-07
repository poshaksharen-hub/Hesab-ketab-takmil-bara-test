
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// This file is the central point for Genkit configuration.
// By initializing it here, we ensure that Genkit is configured once
// and this configured instance is used throughout the application.

export const ai = genkit({
  plugins: [
    googleAI({
       apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
});
