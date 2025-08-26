// postcss.config.js
export default {
    plugins: {
        // Import resolution for @import statements
        'postcss-import': {},

        // CSS nesting support (like Sass nesting)
        'postcss-nesting': {},

        // CSS custom properties (CSS variables) with fallbacks
        'postcss-custom-properties': {
            // Preserve custom properties for runtime usage
            preserve: true
        },

        // Future CSS features with automatic fallbacks
        'postcss-preset-env': {
            // Use stage 2 features (widely supported future CSS)
            stage: 2,
            features: {
                // Enable specific modern CSS features
                'custom-properties': false, // Handled by postcss-custom-properties
                'nesting-rules': false, // Handled by postcss-nesting
                'custom-media-queries': true,
                'media-query-ranges': true,
                'logical-properties-and-values': true,
                'color-functional-notation': true,
                'lab-function': true,
                'oklab-function': true,
                'color-mix': true,
                'cascade-layers': true
                    // Note: Container queries need separate 'postcss-container-query' plugin
            },
            // Browser targets (matches your Vite legacy plugin config)
            browsers: ['defaults', 'not IE 11']
        },

        // Autoprefixer for vendor prefixes
        'autoprefixer': {
            // Browser targets (consistent with postcss-preset-env)
            overrideBrowserslist: ['defaults', 'not IE 11'],
            // Grid layout support
            grid: true
        }
    }
};