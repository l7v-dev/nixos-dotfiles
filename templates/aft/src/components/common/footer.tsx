import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-8">
      <div className="container mx-auto px-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
        <p>© {new Date().getFullYear()} {siteConfig.name} ({siteConfig.fullName}). Tüm hakları saklıdır.</p>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">
          Agentic Framework Template • Next.js App Router Architecture
        </p>
      </div>
    </footer>
  );
}
