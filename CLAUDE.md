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

## Design System Guidelines

### Typography Hierarchy
The site uses a strict typography system defined in `scss/_variables.scss`:
- **$font-s1**: 60px - Main headings (h2)
- **$font-s2**: 32px - Section headings (h3)
- **$font-s3**: 24px - Base text size (p, li, h4)
- **$font-s4**: 20px - Small text, labels, forms
- **$font-s5**: 16px - Smallest text, form hints

**Base Font Rule**: Use `$font-s3` (24px) as the default for all body text. Large text is preferred throughout the site for better readability.

### Color Variables
Defined in `scss/_variables.scss` - **ALWAYS use these variables, never hardcode colors**:
- **$accent**: #41caff - Primary brand color (buttons, links, highlights)
- **$accent-darker**: #048BD8 - Secondary accent for variety
- **$light-grey**: #ccc - Light text, borders
- **$mid-grey**: #aaa - Medium contrast text
- **$dark-grey**: #333 - Dark backgrounds, headers
- **$black**: #111 - Main background color

### Component Styling Patterns

#### Forms
- Use `$font-s4` for all form inputs and labels
- Background: `rgba($dark-grey, 0.8)` with `$mid-grey` borders
- Focus state: `$accent` border with subtle box-shadow
- Consistent padding: `0.75rem`

#### Tables
- Headers: `$dark-grey` background with `$font-s4` text
- Hover: `rgba($accent, 0.1)` background
- Borders: `rgba($mid-grey, 0.3)`
- All text: `$font-s4` minimum

#### Cards & Badges
- Card headers: `$accent` background
- Badges: Use defined color classes (badge-primary, badge-secondary, etc.)
- All text: `$font-s4` for consistency

#### Bootstrap Integration
- Override Bootstrap defaults in `scss/styles.scss`
- Never add inline styles - use design system classes
- Bootstrap conflicts resolved through proper SCSS imports

### Development Rules
1. **Never use inline styles** - all styling goes through SCSS compilation
2. **No font-size overrides** - use the defined typography scale
3. **Color consistency** - only use defined SCSS variables
4. **Large text preference** - default to larger sizes for better UX

## Testing

- Jest test framework configured
- Test files in `tests/` directory
- Coverage excludes node_modules