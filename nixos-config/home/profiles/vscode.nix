# Home profile: VS Code — extension'lar dev.nix'teki dil araçlarıyla eşleşir.
{ pkgs, ... }:
{
  programs.vscode = {
    enable = true;
    package = pkgs.vscode;

    profiles.default = {
      extensions = with pkgs.vscode-extensions; [
        # Nix
        jnoortheen.nix-ide
        mkhl.direnv

        # Python
        ms-python.python
        ms-python.vscode-pylance
        charliermarsh.ruff

        # Rust
        rust-lang.rust-analyzer

        # Go
        golang.go

        # Docker / K8s — konteyner dosyalarını düzenlerken
        ms-azuretools.vscode-docker

        # Genel
        editorconfig.editorconfig
        eamodio.gitlens
      ];

      userSettings = {
        "editor.formatOnSave" = true;
        "editor.rulers" = [ 100 ];
        "files.trimTrailingWhitespace" = true;
        "telemetry.telemetryLevel" = "off";
        "update.mode" = "none"; # Nix paketi güncellenir, VS Code kendi kendini güncellemeye çalışmasın
        "extensions.autoCheckUpdates" = false;
        "nix.enableLanguageServer" = true;
        "nix.serverPath" = "nixd";
        "nix.serverSettings" = {
          "nixd" = {
            "formatting" = {
              "command" = [ "nixfmt" ];
            };
          };
        };
      };
    };
  };
}
