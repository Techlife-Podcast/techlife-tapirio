#!/usr/bin/env node

// scripts/vite-watch-helper.js - Watch for Vite build changes and copy CSS files
const fs = require('fs-extra');
const path = require('path');
const chokidar = require('chokidar');

const distDir = path.join(__dirname, '..', 'dist');
const publicDir = path.join(__dirname, '..', 'public');
const stylesheetsDir = path.join(publicDir, 'stylesheets');

console.log('🔍 Watching for Vite build changes...\n');

// Copy CSS files from dist to public/stylesheets
async function copyStylesheets() {
    try {
        // Ensure stylesheets directory exists
        await fs.ensureDir(stylesheetsDir);

        // Copy styles.css and stats.css to public/stylesheets
        const files = ['styles.css', 'stats.css'];

        for (const file of files) {
            const srcPath = path.join(distDir, file);
            const destPath = path.join(stylesheetsDir, file);

            if (await fs.pathExists(srcPath)) {
                await fs.copy(srcPath, destPath);
                console.log(`✅ Copied ${file} to public/stylesheets/`);
            }
        }

    } catch (error) {
        console.error('❌ Error copying stylesheets:', error);
    }
}

// Set up file watcher
const watcher = chokidar.watch([
    path.join(distDir, 'styles.css'),
    path.join(distDir, 'stats.css')
], {
    ignored: /^\./,
    persistent: true,
    ignoreInitial: false
});

watcher
    .on('add', copyStylesheets)
    .on('change', copyStylesheets)
    .on('ready', () => {
        console.log('👀 Initial scan complete. Ready for changes...\n');
    })
    .on('error', error => {
        console.error('❌ Watcher error:', error);
    });

// Handle process cleanup
process.on('SIGINT', () => {
    console.log('\n🛑 Stopping file watcher...');
    watcher.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Stopping file watcher...');
    watcher.close();
    process.exit(0);
});