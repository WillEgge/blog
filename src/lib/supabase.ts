import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// These environment variables will be set up later
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a single supabase client for interacting with the database
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Helper function for server components
export async function getServerSupabaseClient() {
  // Use createServerComponentClient when in server components
  // Will implement properly when setting up authentication
  return supabase;
}
