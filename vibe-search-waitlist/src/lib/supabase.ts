import { createClient } from "@supabase/supabase-js";

// Supabase configurations should be in environment variables in production
// For development, we'll use these variables directly
// You'll need to replace these with your actual Supabase URLs and keys
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to add email to waitlist
export async function addToWaitlist(email: string, vibe: string = "") {
  try {
    // Try direct insert first
    const { data, error } = await supabase.from("waitlist").insert([{ email, vibe }]).select();

    if (error) {
      if (error.code === "23505") {
        // Unique violation - email already exists
        return { success: false, error: "This email is already on our waitlist." };
      }
      
      if (error.code === "42501") {
        // Row-level security violation - this might happen if RLS is not set correctly
        console.warn("RLS policy error detected. Attempting to use RPC function if available.");
        
        // Try using the RPC function that bypasses RLS
        // Note: You need to have created this function in Supabase first
        // See supabase/migrations/optional_rpc_function.sql
        try {
          const { data: rpcData, error: rpcError } = await supabase
            .rpc('add_to_waitlist', { p_email: email, p_vibe: vibe });

          if (rpcError) {
            console.error("Error with RPC call:", rpcError);
            return { 
              success: false, 
              error: "Database permission issue. Please use the simplified SQL setup or add proper RLS policies." 
            };
          }

          if (rpcData?.error === 'email_exists') {
            return { success: false, error: "This email is already on our waitlist." };
          }

          return { success: true, data: rpcData };
        } catch (rpcCallError) {
          console.error("RPC function not available:", rpcCallError);
          return { 
            success: false, 
            error: "Database permission issue. Please check the Supabase setup README for solutions." 
          };
        }
      }

      console.error("Error adding to waitlist:", error);
      return { success: false, error: "Failed to join waitlist. Please try again." };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Exception adding to waitlist:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}
