# Supabase Setup for Waitlist

This document provides instructions for setting up Supabase for the waitlist functionality.

## Setup Instructions

1. **Create a Supabase Account**
   - Go to [Supabase](https://supabase.com/) and sign up for a free account
   - Create a new project

2. **Configure Database - Choose ONE of the options below**

   ### Option A: Simple Setup (Recommended for Most Users)
   - Navigate to the SQL Editor in your Supabase project
   - Copy the contents of `migrations/simplified_waitlist_table.sql`
   - This creates a table WITHOUT Row Level Security (RLS) for simpler setup
   - Paste it into the SQL Editor and run the query

   ### Option B: Advanced Setup with RLS
   - Navigate to the SQL Editor in your Supabase project
   - Copy the contents of `migrations/create_waitlist_table.sql`
   - This creates a table WITH Row Level Security (RLS)
   - Paste it into the SQL Editor and run the query
   - If you get insertion errors later, consider:
     - Going to "Authentication" > "Policies" in Supabase dashboard
     - Find the waitlist table and verify it has an insert policy for anon
     - Or switch to Option A

3. **Get Credentials**
   - Go to Project Settings > API
   - You'll need:
     - Project URL (e.g., `https://xxxxxxxxxxx.supabase.co`)
     - `anon` public key

4. **Set Environment Variables**
   - Copy `.env.example` to `.env`
   - Add your Supabase URL to `VITE_SUPABASE_URL`
   - Add your anon key to `VITE_SUPABASE_ANON_KEY`

## Troubleshooting RLS Errors

If you're seeing errors with code "42501" (Row-level security violation):

1. **Simplest solution**: Use the simplified setup (Option A above)
2. **Dashboard solution**: Add these policies through the Supabase dashboard:
   - Go to Authentication > Policies
   - Find your waitlist table
   - Click "New Policy" > "Insert" > "For all authenticated and non-authenticated users"
   - Save the policy
3. **Advanced solution**: Use the RPC function to bypass RLS:
   - Run the SQL in `migrations/optional_rpc_function.sql` 
   - This creates a Postgres function that can insert data without being affected by RLS
   - The application code already tries to use this function as a fallback

## Table Structure

The `waitlist` table includes:
- `id`: UUID Primary key (automatically generated)
- `email`: User's email address (must be unique)
- `vibe`: Optional text field for the user's vibe description
- `created_at`: Timestamp when the entry was created