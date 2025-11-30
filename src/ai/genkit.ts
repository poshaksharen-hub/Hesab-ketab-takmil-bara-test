
'use server';

import { genkit, type GenkitConfig } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// This function now accepts an API key and returns a configured Genkit instance.
export function configureAi(apiKey: string) {
  const plugins: GenkitConfig['plugins'] = [];

  if (apiKey) {
    plugins.push(googleAI({ apiKey }));
  }

  return genkit({
    plugins,
    model: 'googleai/gemini-2.5-flash',
  });
}
