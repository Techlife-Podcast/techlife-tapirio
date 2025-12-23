#!/usr/bin/env node

// scripts/vite-watch-helper.mjs - Watch for Vite build changes and copy CSS files
import fs from 'fs-extra';
import path from 'path';
import chokidar from 'chokidar';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(
    import.meta.url));

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
                try {
                    await fs.copy(srcPath, destPath, { overwrite: true, errorOnExist: false });
                    console.log(`✅ Copied ${file} to public/stylesheets/`);
                } catch (error) {
                    if (error && error.code === 'ENOENT' && error.syscall === 'unlink') {
                        // Retry once after ensuring destination dir exists
                        await fs.ensureDir(path.dirname(destPath));
                        await fs.copy(srcPath, destPath, { overwrite: true, errorOnExist: false });
                        console.log(`✅ Copied ${file} to public/stylesheets/ (after retry)`);
                    } else {
                        console.warn(`⚠️  Skipped copying ${file}: ${error.message}`);
                    }
                }
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
    ignoreInitial: true
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