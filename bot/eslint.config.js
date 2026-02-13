import globals from 'globals';
import js from '@eslint/js';

export default [
    // Global configuration for all files
    {
        ignores: ['node_modules/', 'dist/', 'logs/'],
    },
    // Configuration for all JavaScript files in the bot/ directory
    {
        files: ['**/*.js'],
        languageOptions: {
            // Set environment for Node.js and ES2022 (for top-level await, etc.)
            globals: {
                ...globals.node,
                ...globals.es2022,
            },
            sourceType: 'module',
            parserOptions: {
                ecmaVersion: 2022,
            },
        },
        // Use recommended rules
        ...js.configs.recommended,
        rules: {
            // Custom rules for the project
            'no-console': 'off', // Allow console.log for logging utility
            'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_|client', caughtErrors: 'none' }], // Allow unused variables starting with _ and 'client' in event handlers, and ignore unused catch variables
            'no-undef': 'error',
            'prefer-const': 'error',
            'semi': ['error', 'always'],
            'quotes': ['error', 'single'],
            'indent': ['error', 4, { 'SwitchCase': 1 }],
        },
    },
];
