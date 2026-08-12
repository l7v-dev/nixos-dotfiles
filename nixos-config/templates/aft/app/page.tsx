/**
 * Home page component - The main landing page of the application.
 * 
 * <p>This component renders the primary landing page that users see when visiting
 * the root route of the application. It serves as a template demonstrating:
 * <ul>
 *   <li>Server Component architecture (default in Next.js App Router)</li>
 *   <li>Tailwind CSS utility classes for styling</li>
 *   <li>Responsive layout patterns using flexbox</li>
 *   <li>Design token usage via CSS custom properties</li>
 * </ul>
 * 
 * <p><strong>Server Component:</strong> This is a React Server Component by default.
 * It renders on the server and sends static HTML to the client. Add `"use client"`
 * directive only if browser interactivity (hooks, events, state) is required.
 * 
 * @returns The home page JSX with centered content layout
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/rendering/server-components} for Server Components documentation
 * @see {@link ../context/code-standards.md} for project-specific coding standards
 */
export default function Home() {
  return (
    // Main container element with full viewport height and centered content.
    // Uses flexbox for vertical and horizontal centering.
    <main className="flex min-h-screen items-center justify-center">
      {/* Primary heading element with semantic h1 tag. Styling uses design tokens (text-copy-primary) for theming support. */}
      <h1 className="text-2xl font-semibold text-copy-primary">
        __PROJECT_TITLE__
      </h1>
    </main>
  );
}
