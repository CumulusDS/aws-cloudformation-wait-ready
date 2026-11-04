module.exports = {
  extends: ["airbnb-base", "plugin:prettier/recommended", "plugin:@typescript-eslint/recommended"],
  ignorePatterns: ["node_modules/*", "lib/*"],
  rules: {
    "linebreak-style": "off",
    "no-console": "off",
    "no-restricted-syntax": "off",
    "no-await-in-loop": "off",
    "import/extensions": [
      "error",
      "ignorePackages",
      {
        js: "never",
        jsx: "never",
        ts: "never",
        tsx: "never",
      },
    ],
  },
  parser: "@typescript-eslint/parser",
  plugins: ["jest", "@typescript-eslint"],
  env: {
    "jest/globals": true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
  },
  settings: {
    "import/parsers": {
      "@typescript-eslint/parser": [".ts", ".tsx"],
    },
    "import/resolver": {
      node: {
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      },
      typescript: {
        alwaysTryTypes: true,
        project: ["./tsconfig.json", "./tsconfig.build.json"],
      },
    },
  },
  overrides: [
    {
      files: ["**/*.ts"],
      parser: "@typescript-eslint/parser",
      plugins: ["@typescript-eslint"],
      extends: ["plugin:@typescript-eslint/recommended"],
    },
    {
      files: ["vitest.config.mts"],
      rules: {
        "import/no-extraneous-dependencies": "off",
      },
    },
  ],
};
