
import { genkit, type GenkitConfig } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// This file is the central point for Genkit configuration.
// By initializing it here, we ensure that Genkit is configured once
// with the correct API key from environment variables, and this configured
// instance is used throughout the application.

export const ai = genkit({
  plugins: [
    googleAI({
       apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
});
