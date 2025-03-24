# Supabase Setup for Waitlist

This document provides instructions for setting up Supabase for the waitlist functionality.

## Setup Instructions

1. **Create a Supabase Account**
   - Go to [Supabase](https://supabase.com/) and sign up for a free account
   - Create a new project

2. **Configure Database**
   - Navigate to the SQL Editor in your Supabase project
   - Copy the contents of `migrations/create_waitlist_table.sql`
   - Paste it into the SQL Editor and run the query

3. **Get Credentials**
   - Go to Project Settings > API
   - You'll need:
     - Project URL (e.g., `https://xxxxxxxxxxx.supabase.co`)
     - `anon` public key

4. **Set Environment Variables**
   - Copy `.env.example` to `.env`
   - Add your Supabase URL to `VITE_SUPABASE_URL`
   - Add your anon key to `VITE_SUPABASE_ANON_KEY`

## Table Structure

The `waitlist` table includes:
- `id`: UUID Primary key (automatically generated)
- `email`: User's email address (must be unique)
- `vibe`: Optional text field for the user's vibe description
- `created_at`: Timestamp when the entry was created

## Security

The table is secured using Row Level Security (RLS) policies:
- Anyone can insert data (necessary for the waitlist form)
- Only service role users can view the data (admin-only access)