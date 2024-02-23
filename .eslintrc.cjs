/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
    root: true,
    env: {
        'vue/setup-compiler-macros': true,
        browser: true,
        es6: true,
    },
    extends: [
        'plugin:vue/vue3-essential',
        'eslint:recommended',
        '@vue/eslint-config-typescript/recommended',
        '@vue/eslint-config-prettier',
        'prettier',
    ],
    rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'vue/no-mutating-props': 'off',
        'vue/valid-template-root': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
    },
    ignorePatterns: ['*.config.js'],
};
