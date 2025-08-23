# SCSS Build Migration to Vite

This document outlines the migration from manual Dart Sass compilation to Vite for improved development experience and build performance.

## What Changed

### Before (Manual Sass)
- Used `sass --watch scss:public/stylesheets` for development
- Used `sass scss/styles.scss:public/stylesheets/styles.css --style compressed` for production
- Manual compilation process with separate watch mode

### After (Vite)
- Uses Vite's built-in SCSS processing with modern optimization
- Automatic CSS minification and optimization
- Better source maps and development experience
- Legacy browser support via Rollup plugins

## New Build Scripts

### Development
```bash
npm run sass          # Watch mode - rebuilds on SCSS changes
npm run dev           # Full development - server + SCSS watch
```

### Production
```bash
npm run sass-build    # Production build with minification
npm run build         # Full production build including assets
```

## File Structure

```
scss/
├── styles.scss       # Main stylesheet (entry point)
├── stats.scss        # Stats page stylesheet (entry point)
├── _variables.scss   # SCSS variables
├── _mixins.scss      # SCSS mixins
└── bootstrap/        # Bootstrap SCSS components
    ├── _functions.scss
    ├── _variables.scss
    └── _breakpoints.scss

public/stylesheets/   # Output directory
├── styles.css        # Compiled main styles
└── stats.css         # Compiled stats styles

dist/                 # Vite build output (git-ignored)
└── ...              # Temporary build files
```

## Configuration Files

### `vite.config.js`
- Main Vite configuration
- SCSS processing options
- Output directory configuration
- Legacy browser support

### Build Scripts
- `scripts/vite-postbuild.js` - Copies CSS files to correct location after build
- `scripts/vite-watch-helper.js` - Handles file watching and copying during development

## Benefits

1. **Faster Builds**: Vite's optimized build process
2. **Better Development**: Hot reload and faster rebuilds
3. **Modern Tooling**: Access to Vite ecosystem and plugins
4. **Automatic Optimization**: Built-in CSS minification and tree-shaking
5. **Legacy Support**: Automatic polyfills for older browsers

## Deprecation Warnings

The build currently shows SCSS deprecation warnings from Bootstrap 4. These are:
- `@import` statements (should use `@use`)
- Deprecated color functions (`darken()`, `lighten()`)
- Global built-in functions

These warnings don't affect functionality but should be addressed in future updates to Bootstrap 5 or by updating the SCSS syntax.

## Migration Notes

- All existing SCSS files remain unchanged
- Output CSS files are identical to previous build
- No changes required to HTML templates or asset references
- `.gitignore` updated to exclude `dist/` directory
- Development workflow remains the same (`npm run dev`)
