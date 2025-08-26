#!/usr/bin/env node

// scripts/vite-postbuild.js
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('📦 Post-processing Vite build files...\n');

const distDir = path.join(__dirname, '..', 'dist');
const publicDir = path.join(__dirname, '..', 'public');
const stylesheetsDir = path.join(publicDir, 'stylesheets');

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
            } else {
                console.warn(`⚠️  ${file} not found in dist directory`);
            }
        }

        console.log('\n🎉 Stylesheets copied successfully!');

    } catch (error) {
        console.error('❌ Error copying stylesheets:', error);
        process.exit(1);
    }
}

copyStylesheets();