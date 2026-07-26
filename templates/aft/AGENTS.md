# Agentic Framework Template (AFT) - AI Agent Governance

Bu proje **AFT (Agentic Framework Template)** standartlarında NixOS izole geliştirme ortamı ile yapılandırılmıştır.

## 🛠️ Proje Komutları
- Dev Shell: `devenv shell`
- Dev Server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

## 📐 Mimari ve Kodlama Standartları
- **Framework:** Next.js (App Router, React 19, TypeScript).
- **Stil:** TailwindCSS v4.
- **Bileşen Yapısı:**
  - UI bileşenleri: `src/components/ui/` (button, card, input, badge).
  - Genel bileşenler: `src/components/common/` (header, footer).
  - Class merging: `src/lib/utils.ts` içindeki `cn()` fonksiyonu.
- **Bağlam Taraması:** AI Agent'lar geliştirmeye başlamadan önce `context/` dizinindeki dokümanları okumalıdır.

## 🔒 Güvenlik ve Kurallar
1. Sistem geneline paket yüklemeyin; bağımlılıkları `devenv.nix` veya `package.json` içerisine ekleyin.
2. Sabit API anahtarlarını koda yazmayın, `.env.local` kullanın.
3. Tip güvenliğini tam sağlamak için `any` yerine belirlenmiş TypeScript arayüzlerini kullanın.
