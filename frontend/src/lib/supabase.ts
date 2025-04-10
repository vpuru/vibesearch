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

// Function to upload images to Supabase storage
export const uploadImagesToSupabase = async (files: File[]): Promise<string[]> => {
  try {
    const imageUrls: string[] = [];
    
    for (const file of files) {
      // Create a unique file name
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${file.name}`;
      
      // Upload the file to Supabase storage
      const { data, error } = await supabase
        .storage
        .from('image-search-2')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) throw error;
      
      // Get the public URL for the uploaded file
      const { data: { publicUrl } } = supabase
        .storage
        .from('image-search-2')
        .getPublicUrl(data.path);
      
      imageUrls.push(publicUrl);
    }
    
    return imageUrls;
  } catch (error) {
    console.error('Error uploading images to Supabase:', error);
    throw error;
  }
};