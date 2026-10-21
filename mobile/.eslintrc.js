module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2022: true,
  },
  extends: [
    "eslint:recommended",
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: [
    "react",
  ],
  rules: {
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_|^user$|^onFetch|^childId$" }],
    "react/jsx-uses-react": "warn",
    "react/jsx-uses-vars": "warn",
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};
