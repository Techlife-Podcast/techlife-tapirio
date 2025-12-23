#!/usr/bin/env node

// Build script for generating asset manifest with cache busting
import CacheBuster from './cache-buster.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Building assets with cache busting...\n');

// Initialize cache buster
const cacheBuster = new CacheBuster({
    publicDir: path.join(__dirname, '..', 'public'),
    manifestPath: path.join(__dirname, '..', 'public', 'asset-manifest.json')
});

// Generate manifest for production
const manifest = cacheBuster.generateManifest();

console.log('\n✅ Asset manifest generated successfully!');
console.log('📄 Manifest contents:', JSON.stringify(manifest, null, 2));

// Log instructions
console.log('\n📋 Usage:');
console.log('- Assets will be automatically versioned in production');
console.log('- In development, timestamps are used for cache busting');
console.log('- Templates use assetUrl() helper for versioned URLs');
console.log('- Run "npm run cache-bust" to regenerate manifest');

process.exit(0);