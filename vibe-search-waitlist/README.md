# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/cda98a1d-e050-4907-b180-9fa27bdae664

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/cda98a1d-e050-4907-b180-9fa27bdae664) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Set up environment variables
# Copy .env.example to .env and update with your Supabase credentials
cp .env.example .env

# Step 5: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (for waitlist data storage)

## Supabase Setup

This project uses Supabase to store waitlist submissions. To set up:

1. Create a Supabase account and project
2. Set up the waitlist table - see detailed instructions in [supabase/README.md](./supabase/README.md)
3. Get your Supabase URL and anon key from Project Settings > API
4. Create a .env file with these values:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

If you encounter any RLS-related errors (code: 42501), see the troubleshooting section in the [Supabase README](./supabase/README.md).

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/cda98a1d-e050-4907-b180-9fa27bdae664) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)
