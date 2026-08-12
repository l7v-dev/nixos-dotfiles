import type { Metadata } from "next";
import "./globals.css";

/**
 * Application metadata configuration for SEO and social media sharing.
 * 
 * <p>This metadata object defines how the application appears in:
 * <ul>
 *   <li>Search engine results (title, description)</li>
 *   <li>Social media previews (Open Graph, Twitter Cards)</li>
 *   <li>Browser tabs and bookmarks</li>
 * </ul>
 * 
 * <p><strong>Note:</strong> The `__PROJECT_TITLE__` placeholder should be replaced
 * during project initialization with the actual project name.
 * 
 * @property title - The page title displayed in browser tabs and search results
 * @property description - Meta description for SEO and social sharing previews
 */
export const metadata: Metadata = {
  /** 
   * Page title for SEO and browser display.
   * Replace __PROJECT_TITLE__ with actual project name during initialization.
   */
  title: "__PROJECT_TITLE__",
  /** 
   * Meta description for search engines and social media previews.
   * Should be a concise summary of the page content (150-160 characters recommended).
   */
  description: "__PROJECT_TITLE__",
};

/**
 * Root layout component props interface.
 * 
 * @interface RootLayoutProps
 * @property {React.ReactNode} children - Child components to be rendered within the layout
 */
interface RootLayoutProps {
  children: React.ReactNode;
}

/**
 * Root layout component for the Next.js application.
 * 
 * <p>This component serves as the top-level wrapper for all pages in the application,
 * providing:
 * <ul>
 *   <li>HTML document structure with language attribute</li>
 *   <li>Global CSS styles import</li>
 *   <li>Metadata injection via the metadata export</li>
 * </ul>
 * 
 * <p><strong>Server Component:</strong> This is a React Server Component by default.
 * Do not add client-side hooks or browser APIs directly to this component.
 * 
 * @param props - Component props containing children
 * @param props.children - Child components rendered within this layout
 * @returns The root HTML structure for all pages
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/colocation#root-layout-required} for Next.js root layout documentation
 */
export default function RootLayout({
  children,
}: Readonly<RootLayoutProps>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
