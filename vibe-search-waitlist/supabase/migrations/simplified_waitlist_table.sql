-- Create waitlist table (simplified version without RLS)
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

-- Disable RLS for this table (simpler approach for waitlist)
ALTER TABLE waitlist DISABLE ROW LEVEL SECURITY;