import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple CSS class names intelligently by merging Tailwind CSS classes.
 * 
 * <p>This utility function serves as a class name merger that:
 * <ul>
 *   <li>Accepts multiple class name inputs of various types (strings, arrays, objects)</li>
 *   <li>Filters out falsy values automatically via clsx</li>
 *   <li>Merges conflicting Tailwind CSS utilities using tailwind-merge</li>
 *   <li>Returns a single optimized class name string</li>
 * </ul>
 * 
 * @param inputs - Variable number of class values to be merged. Each input can be a string,
 *                 array of strings, or an object with truthy/falsy keys.
 * @returns A single string containing the merged and optimized class names.
 * 
 * @example
 * // Basic usage with conditional classes
 * cn('btn', 'btn-primary', isActive && 'active')
 * 
 * @example
 * // Merging conflicting Tailwind classes (later wins)
 * cn('px-4 px-6', 'text-red-500 text-blue-500') // returns 'px-6 text-blue-500'
 * 
 * @see {@link https://github.com/lukeed/clsx} for clsx documentation
 * @see {@link https://github.com/dcastil/tailwind-merge} for tailwind-merge documentation
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
