import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Bot, Cpu, Layers, ShieldCheck, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-12 py-6">
      {/* Hero Section */}
      <section className="text-center space-y-6 max-w-3xl mx-auto py-12">
        <Badge variant="default" className="gap-1.5 py-1 px-3">
          <Sparkles className="w-3.5 h-3.5" /> Agentic Framework Template (AFT)
        </Badge>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
          2026 AI Agent & Sistem Mimarisi Şablonu
        </h1>
        <p className="text-lg text-zinc-400 leading-relaxed">
          NixOS/Devenv declarative izolasyonu, Next.js 16 App Router mimarisi ve AI Agent bağlam yönetişimi (`AFT`).
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Button size="lg" className="gap-2">
            Hızlı Başlat <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="lg">
            Mimari Kılavuz
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:border-indigo-500/50 transition-colors">
          <CardHeader>
            <Bot className="w-8 h-8 text-indigo-400 mb-2" />
            <CardTitle>AI Agent Governance</CardTitle>
            <CardDescription>
              `AGENTS.md`, `.mcp.json` ve `context/` dokümantasyonu ile kod kayması olmadan AI ile pair-programming.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:border-indigo-500/50 transition-colors">
          <CardHeader>
            <Layers className="w-8 h-8 text-indigo-400 mb-2" />
            <CardTitle>Full-Stack Component Yapısı</CardTitle>
            <CardDescription>
              Atomik UI parçaları, Prisma ORM taslağı ve tip güvenli utility yardımcıları.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:border-indigo-500/50 transition-colors">
          <CardHeader>
            <ShieldCheck className="w-8 h-8 text-indigo-400 mb-2" />
            <CardTitle>Nix & Devenv İzolasyonu</CardTitle>
            <CardDescription>
              Her sistemde %100 tekrarlanabilir, çakışmasız declarative geliştirme kabuğu.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    </div>
  );
}
