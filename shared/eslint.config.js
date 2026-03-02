import globals from 'globals';
import tseslint from 'typescript-eslint';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default [
    {
        ignores: ['node_modules/', '**/*.d.ts', 'eslint.config.js', 'eslint.config.*'],
    },
    {
        files: ['eslint.config.js'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
            sourceType: 'module',
            parserOptions: {
                ecmaVersion: 2022,
                tsconfigRootDir: __dirname,
            },
        },
        rules: {},
    },
    ...tseslint.configs.recommended,
    {
        files: ['**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.es2022,
            },
            sourceType: 'module',
            parserOptions: {
                ecmaVersion: 2022,
                project: './tsconfig.json',
                tsconfigRootDir: __dirname,
            },
        },
        rules: {
            'no-console': 'off',
            'no-unused-vars': 'off',
            'prefer-const': 'error',
            'semi': ['error', 'always'],
            'quotes': ['error', 'single'],
            'indent': ['error', 4, { SwitchCase: 1 }],
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
    {
        files: ['**/*.js'],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.es2022,
            },
            sourceType: 'module',
            parserOptions: {
                ecmaVersion: 2022,
                tsconfigRootDir: __dirname,
            },
        },
        rules: {
            'no-console': 'off',
            'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
            '@typescript-eslint/no-unused-vars': 'off',
            'prefer-const': 'error',
            'semi': ['error', 'always'],
            'quotes': ['error', 'single'],
            'indent': ['error', 4, { SwitchCase: 1 }],
        },
    },
];
