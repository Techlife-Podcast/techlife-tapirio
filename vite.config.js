// vite.config.js
import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';
import { resolve } from 'path';

export default defineConfig({
    plugins: [
        legacy({
            targets: ['defaults', 'not IE 11']
        })
    ],

    // Set publicDir to false to avoid conflicts
    publicDir: false,

    // Configure build options
    build: {
        // Output directory for built files
        outDir: 'dist',

        // Generate manifest for asset management
        manifest: true,

        // Empty the dist directory before building
        emptyOutDir: true,

        rollupOptions: {
            input: {
                // Main styles entry point
                styles: resolve(__dirname, 'scss/styles.scss'),
                // Stats styles entry point  
                stats: resolve(__dirname, 'scss/stats.scss')
            },
            output: {
                // Put CSS files with clean names in root
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name.endsWith('.css')) {
                        return `${assetInfo.name}`;
                    }
                    return 'assets/[name]-[hash][extname]';
                }
            }
        }
    },

    // Configure CSS processing
    css: {
        // PostCSS configuration is automatically picked up from postcss.config.js
        postcss: true,
        preprocessorOptions: {
            scss: {
                // Enable modern sass API
                api: 'modern-compiler',
                // Load paths for @import resolution
                loadPaths: [
                    resolve(__dirname, 'scss'),
                    resolve(__dirname, 'scss/bootstrap')
                ]
            }
        }
    },

    // Development server configuration
    server: {
        // Watch SCSS files for changes
        watch: {
            usePolling: true,
            include: ['scss/**/*.scss']
        }
    }
});