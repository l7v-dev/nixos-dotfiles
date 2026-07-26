{ pkgs, ... }:

{
  env.PROJECT_NAME = "aft";

  packages = with pkgs; [
    git
    jq
    curl
    typescript-language-server
  ];

  languages.javascript = {
    enable = true;
    npm.enable = true;
    pnpm.enable = true;
    bun.enable = true;
  };
  languages.typescript.enable = true;

  enterShell = ''
    echo "🚀 Agentic Framework Template (AFT) Geliştirme Ortamı Aktif!"
  '';
}
