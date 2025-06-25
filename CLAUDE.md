# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development**: `npm run dev` - Runs both the server and Sass watcher concurrently
- **Production start**: `npm start` - Starts the main application server
- **Admin panel**: `npm run admin` - Starts the admin interface
- **Tests**: `npm test` - Runs Jest test suite
- **Sass compilation**: `npm run sass-build` - Compiles SCSS to compressed CSS

## Architecture Overview

This is a Node.js/Express podcast website for "Techlife Podcast" (Технологии и жизнь) with the following key components:

### Core Architecture
- **Express.js** web framework with Pug templating
- **Content Management**: Markdown articles processed from `content/articles/`
- **Podcast Feed**: XML podcast feed parsing and processing
- **SCSS/Sass** for styling with Bootstrap 4 integration
- **Static Assets**: Served from `public/` directory

### Key Modules
- `scripts/app.functions.js` - Main Project class that handles content compilation and podcast feed processing
- `scripts/compiler.js` - Markdown compilation and processing
- `scripts/get-feed.js` - Podcast XML feed parsing
- `scripts/utils/episode-processor.js` - Episode data processing utilities

### Routes Structure
- `routes/index.js` - Main website routes (home, episodes, blog, etc.)
- `routes/stats.js` - Statistics and analytics endpoints
- `routes/users.js` - User-related routes

### Content Structure
- Articles stored as Markdown in `content/articles/`
- Podcast episodes metadata from XML feed in `public/podcast-feed.xml`
- Site configuration in `content/preferences.json`
- Episode images in `public/images/` with naming pattern `techlifepodcast-ep{number}-{title}.jpg`

### Admin Panel
- Separate admin interface accessible via `npm run admin`
- Located in `admin/` directory with its own routes and views

## Development Notes

- The application uses dual initialization in both `app.js` and `routes/index.js` for data loading
- Environment variables loaded from `.server` file
- Default development port is 4002 (configurable via PORT env var)
- Local development URL: http://localhost:3501 (as mentioned in README)
- Pug templates located in `pages/` directory with partials in `pages/partials/`

## Testing

- Jest test framework configured
- Test files in `tests/` directory
- Coverage excludes node_modules