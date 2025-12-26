import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // We throw an error only if the variables are missing, not if they are just empty strings during build time.
  if (typeof window !== 'undefined') {
    throw new Error('Supabase URL and Anon Key are required in the browser environment.');
  } else {
    // During server-side build, these might not be available, which is acceptable.
    console.warn("Supabase environment variables are not set. This is expected during build time, but will cause errors at runtime if not configured.");
  }
}

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!)
