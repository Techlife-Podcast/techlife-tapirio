// vite.config.js
import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';
import { resolve } from 'path';

// Silence Sass deprecation warnings (import/global-builtin/color-functions)
process.env.SASS_SILENCE_DEPRECATIONS = process.env.SASS_SILENCE_DEPRECATIONS ?
    process.env.SASS_SILENCE_DEPRECATIONS :
    'import,global-builtin,color-functions';

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

        // Enable minification
        minify: 'terser',

        // Configure terser options for better compression
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
            }
        },

        // Enable CSS code splitting for better caching
        cssCodeSplit: true,

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
                },
                // Enable tree shaking for better optimization
                manualChunks: undefined
            },
            // Tree shaking configuration
            treeshake: {
                moduleSideEffects: false,
                propertyReadSideEffects: false,
                unknownGlobalSideEffects: false
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
                // Suppress deprecation noise during transition period
                quietDeps: true,
                silenceDeprecations: ['import', 'global-builtin', 'color-functions'],
                // Load paths for @import resolution
                loadPaths: [
                    resolve(__dirname, 'scss'),
                    resolve(__dirname, 'scss/bootstrap')
                ]
            }
        },
        // Enable CSS minification
        devSourcemap: false
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