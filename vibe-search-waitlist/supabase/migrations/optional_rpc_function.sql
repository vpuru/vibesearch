-- Optional RPC Function that bypasses RLS
-- This function can be used if you're having issues with RLS
-- but still want to maintain the RLS policies for security

-- Create the function that will bypass RLS
CREATE OR REPLACE FUNCTION add_to_waitlist(p_email TEXT, p_vibe TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- This bypasses RLS
AS $$
DECLARE
  result JSONB;
  new_id UUID;
BEGIN
  -- Try to insert the data
  INSERT INTO waitlist (email, vibe)
  VALUES (p_email, p_vibe)
  RETURNING id INTO new_id;
  
  -- If successful, return the data
  SELECT jsonb_build_object(
    'id', id,
    'email', email,
    'vibe', vibe,
    'created_at', created_at
  ) INTO result
  FROM waitlist
  WHERE id = new_id;
  
  RETURN result;
EXCEPTION
  WHEN unique_violation THEN
    -- Email already exists
    RETURN jsonb_build_object('error', 'email_exists');
  WHEN OTHERS THEN
    -- Other errors
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;