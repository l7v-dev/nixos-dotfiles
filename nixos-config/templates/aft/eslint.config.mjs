import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * ESLint configuration for Next.js TypeScript project.
 * 
 * <p>This configuration file sets up linting rules for the project by combining:
 * <ul>
 *   <li>Next.js Core Web Vitals rules for performance optimization</li>
 *   <li>Next.js TypeScript-specific rules for type safety</li>
 *   <li>Custom ignore patterns to override default exclusions</li>
 * </ul>
 * 
 * <p><strong>Configuration Strategy:</strong>
 * The configuration uses a modular approach by spreading predefined rule sets
 * from eslint-config-next packages. This ensures alignment with Next.js best
 * practices while maintaining flexibility for customizations.
 * 
 * <p><strong>Ignore Patterns:</strong>
 * Default ignore patterns from eslint-config-next are overridden to provide
 * explicit control over which files and directories are excluded from linting.
 * This includes build artifacts and generated files.
 * 
 * @constant {Array} eslintConfig - Array of ESLint configuration objects
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/configuring/eslint} for Next.js ESLint documentation
 * @see {@link https://eslint.org/docs/latest/use/configure/configuration-files-new} for ESLint flat config format
 * @since 1.0.0
 */
const eslintConfig = defineConfig([
  /**
   * Next.js Core Web Vitals configuration.
   * Includes rules for optimizing Largest Contentful Paint (LCP),
   * First Input Delay (FID), and Cumulative Layout Shift (CLS).
   */
  ...nextVitals,
  
  /**
   * Next.js TypeScript-specific configuration.
   * Provides type-aware linting rules and TypeScript best practices.
   */
  ...nextTs,
  
  // Override default ignores of eslint-config-next.
  /**
   * Global ignore patterns for excluding files from linting.
   * 
   * <p>These patterns ensure that build artifacts, generated files,
   * and deployment directories are not processed by ESLint, improving
   * performance and preventing false positives.</p>
   * 
   * <ul>
   *   <li><code>.next/**</code> - Next.js build output directory</li>
   *   <li><code>out/**</code> - Static export output directory</li>
   *   <li><code>build/**</code> - Alternative build output directory</li>
   *   <li><code>next-env.d.ts</code> - Next.js generated TypeScript declarations</li>
   * </ul>
   */
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
