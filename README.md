# CircaV2 Migration - Carbon Accounting Platform

A modern carbon accounting platform built with React, TypeScript, and Supabase.

## Environment Setup

### Required Environment Variables

Copy `env.example` to `.env` and fill in your actual values:

```bash
cp env.example .env
```

Required variables:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous/public key
- `VITE_SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for scripts only)
- `OPENAI_API_KEY` - Your OpenAI API key for emission calculations

### Security Note

⚠️ **Never commit API keys to the repository!** 

All sensitive keys have been moved to environment variables. The `.env` file is already in `.gitignore` to prevent accidental commits.

## Development

```bash
npm install
npm run dev
```

## Features

- **Emission Calculations**: RAG-based and OpenAI-powered emission factor matching
- **Data Traceability**: Complete audit trail of all calculations
- **Dashboard**: Real-time carbon accounting insights
- **File Upload**: CSV import with intelligent data processing
- **Multi-scope Support**: Scope 1, 2, and 3 emissions tracking

## Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI**: OpenAI GPT-4 + RAG system for emission factors
- **Styling**: Tailwind CSS + shadcn/ui components

Updated for Vercel deployment on May 20, 2024.

# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/7575453a-7a82-4958-b907-472a918e9e20

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/7575453a-7a82-4958-b907-472a918e9e20) and start prompting.

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

# Step 4: Start the development server with auto-reloading and an instant preview.
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

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/7575453a-7a82-4958-b907-472a918e9e20) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
