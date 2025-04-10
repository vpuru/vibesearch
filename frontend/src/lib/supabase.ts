import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a single supabase client for interacting with the database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Function to submit user feedback
export const submitFeedback = async ({
  category,
  text,
  user_id = null
}: {
  category: string;
  text: string;
  user_id?: string | null;
}) => {
  try {
    const { data, error } = await supabase
      .from('user_feedback')
      .insert([
        {
          category,
          feedback: text,
          user_id,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}; 