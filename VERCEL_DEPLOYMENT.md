# Vercel Deployment Configuration

This document outlines the configuration needed for deploying the Techlife Podcast website to Vercel.

## Files Added for Vercel

1. **`vercel.json`** - Main Vercel configuration file
   - Defines build and route configuration
   - Maps static files from `public/` directory
   - Routes all dynamic requests to Express serverless function

2. **`api/index.js`** - Serverless function wrapper for Express app
   - Exports the Express app to be run as a Vercel serverless function

3. **`.vercelignore`** - Files to exclude from Vercel deployment

## Required Environment Variables

Set these in the Vercel dashboard (Project Settings → Environment Variables):

- `OPENAI_API_KEY` - Your OpenAI API key (required for podcast analysis features)
- `NODE_ENV` - Set to `production`

## Build Configuration in Vercel Dashboard

- **Build Command**: `npm run build` (already configured in vercel.json)
- **Output Directory**: Auto-detected
- **Install Command**: `npm install`

## How It Works

1. **Build Phase**:
   - Vercel runs `npm install` to install dependencies including `sass-embedded`
   - Runs `npm run build` which:
     - Compiles SCSS to CSS using Vite with modern-compiler API
     - Copies compiled CSS from `dist/` to `public/stylesheets/`
     - Generates asset manifest for cache busting

2. **Runtime**:
   - Static files (CSS, images, JS, etc.) served from `public/` directory
   - All dynamic routes handled by Express app via `api/index.js` serverless function
   - App initialization happens on first request (including loading podcast feed XML)

## Important Notes

- The `dist/` folder is not committed to git (it's built during deployment)
- The `.env` file is gitignored - use Vercel's environment variables instead
- The Express app runs as a serverless function with 10s max duration
- Static assets are cached efficiently by Vercel's CDN

## Troubleshooting

If deployment fails:

1. Check that `sass-embedded` is in `package.json` devDependencies
2. Verify all environment variables are set in Vercel dashboard
3. Ensure `public/podcast-feed.xml` and `content/` directory are committed to git
4. Check Vercel build logs for specific error messages
