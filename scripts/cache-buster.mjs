// Cache busting utility for static assets
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class CacheBuster {
    constructor(options = {}) {
        this.publicDir = options.publicDir || path.join(__dirname, '..', 'public');
        this.manifestPath = options.manifestPath || path.join(this.publicDir, 'asset-manifest.json');
        this.hashLength = options.hashLength || 8;
        this.manifest = {};
        this.isDev = process.env.NODE_ENV !== 'production';
        
        // Load existing manifest if it exists
        this.loadManifest();
    }

    /**
     * Load existing asset manifest
     */
    loadManifest() {
        try {
            if (fs.existsSync(this.manifestPath)) {
                this.manifest = fs.readJsonSync(this.manifestPath);
            }
        } catch (error) {
            console.warn('Could not load asset manifest:', error.message);
            this.manifest = {};
        }
    }

    /**
     * Save asset manifest to file
     */
    saveManifest() {
        try {
            fs.writeJsonSync(this.manifestPath, this.manifest, { spaces: 2 });
        } catch (error) {
            console.error('Could not save asset manifest:', error.message);
        }
    }

    /**
     * Generate hash for file content
     */
    generateHash(filePath) {
        try {
            const content = fs.readFileSync(filePath);
            return crypto.createHash('md5').update(content).digest('hex').substring(0, this.hashLength);
        } catch (error) {
            console.error(`Could not generate hash for ${filePath}:`, error.message);
            return Date.now().toString(36); // Fallback to timestamp
        }
    }

    /**
     * Get versioned asset URL
     */
    getAssetUrl(assetPath) {
        // In development, use simple timestamp for easy cache busting
        if (this.isDev) {
            const separator = assetPath.includes('?') ? '&' : '?';
            return `${assetPath}${separator}v=${Date.now()}`;
        }

        // In production, use file hash from manifest
        const normalizedPath = assetPath.startsWith('/') ? assetPath.substring(1) : assetPath;
        
        if (this.manifest[normalizedPath]) {
            const separator = assetPath.includes('?') ? '&' : '?';
            return `${assetPath}${separator}v=${this.manifest[normalizedPath]}`;
        }

        // If not in manifest, try to generate hash on-the-fly
        const fullPath = path.join(this.publicDir, normalizedPath);
        if (fs.existsSync(fullPath)) {
            const hash = this.generateHash(fullPath);
            this.manifest[normalizedPath] = hash;
            this.saveManifest();
            
            const separator = assetPath.includes('?') ? '&' : '?';
            return `${assetPath}${separator}v=${hash}`;
        }

        // Fallback to original path with timestamp
        const separator = assetPath.includes('?') ? '&' : '?';
        return `${assetPath}${separator}v=${Date.now()}`;
    }

    /**
     * Generate manifest for all assets
     */
    generateManifest() {
        const assetPaths = [
            'stylesheets/styles.css',
            'javascript/player.js',
            'javascript/scripts.js'
        ];

        console.log('Generating asset manifest...');
        
        assetPaths.forEach(assetPath => {
            const fullPath = path.join(this.publicDir, assetPath);
            if (fs.existsSync(fullPath)) {
                const hash = this.generateHash(fullPath);
                this.manifest[assetPath] = hash;
                console.log(`✓ ${assetPath} -> ${hash}`);
            } else {
                console.warn(`⚠ Asset not found: ${assetPath}`);
            }
        });

        this.saveManifest();
        console.log(`Asset manifest saved to: ${this.manifestPath}`);
        return this.manifest;
    }

    /**
     * Clear manifest (useful for development)
     */
    clearManifest() {
        this.manifest = {};
        if (fs.existsSync(this.manifestPath)) {
            fs.unlinkSync(this.manifestPath);
        }
    }
}

export default CacheBuster;