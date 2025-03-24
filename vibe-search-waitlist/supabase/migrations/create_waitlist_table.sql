-- Create waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  vibe TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Basic validation for email
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create an index for faster email lookups
CREATE INDEX IF NOT EXISTS waitlist_email_idx ON waitlist (email);

-- Set up Row Level Security (RLS)
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Create policy for row insertion (to be used with anon key)
CREATE POLICY waitlist_insert_policy ON waitlist
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Only admins with service_role key should access the entries
CREATE POLICY waitlist_select_policy ON waitlist
  FOR SELECT
  USING (auth.role() = 'service_role');