import { createClient } from '@supabase/supabase-js';

// Supabase configurations should be in environment variables in production
// For development, we'll use these variables directly
// You'll need to replace these with your actual Supabase URLs and keys
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to add email to waitlist
export async function addToWaitlist(email: string, vibe: string = '') {
  try {
    const { data, error } = await supabase
      .from('waitlist')
      .insert([{ email, vibe }])
      .select();

    if (error) {
      if (error.code === '23505') {
        // Unique violation - email already exists
        return { success: false, error: 'This email is already on our waitlist.' };
      }
      
      console.error('Error adding to waitlist:', error);
      return { success: false, error: 'Failed to join waitlist. Please try again.' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception adding to waitlist:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}