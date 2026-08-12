# l7v-panel monorepo dev shell and build outputs.
# Run `nix develop` to enter a shell with Go 1.22, Node.js 22, and pnpm 9.
# Run `nix build .#panel-agent` or `nix build .#panel-frontend` to build derivations.
{
  description = "l7v-panel — NixOS control panel";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    gomod2nix = {
      url = "github:nix-community/gomod2nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      gomod2nix,
    }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        buildInputs = with pkgs; [
          go_1_22
          gomod2nix.packages.${system}.default
          nodejs_22
          nodePackages.pnpm
          # Useful dev tools
          gopls
          golangci-lint
          delve
        ];

        shellHook = ''
          echo "[INFO] l7v-panel dev shell ready"
          echo "  Go:   $(go version)"
          echo "  Node: $(node --version)"
          echo "  pnpm: $(pnpm --version)"
        '';
      };

      packages.${system} = {
        # Panel agent Go binary — built from local source.
        # Update vendorHash after running: cd apps/agent && gomod2nix generate
        panel-agent = pkgs.callPackage ../platform/pkgs/panel-agent { };

        # Panel frontend Next.js app — built from local source.
        # Update pnpmDeps hash after: nix run nixpkgs#prefetch-pnpm-deps -- pnpm-lock.yaml
        panel-frontend = pkgs.callPackage ../platform/pkgs/panel-frontend { };
      };
    };
}
