import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-zinc-900 dark:text-white">
            <span className="h-3 w-3 rounded-full bg-indigo-500 animate-pulse" />
            {siteConfig.name}
          </Link>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <Link href="#features" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
              Özellikler
            </Link>
            <Link href="#architecture" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
              Mimari
            </Link>
            <Link href="#docs" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
              Dokümantasyon
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            Giriş Yap
          </Button>
          <Button size="sm">Başla</Button>
        </div>
      </div>
    </header>
  );
}
