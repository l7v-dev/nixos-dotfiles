{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    devenv.url  = "github:cachix/devenv";
  };

  outputs = inputs@{ nixpkgs, devenv, ... }:
    let system = "x86_64-linux";
    in {
      devShells.${system}.default =
        devenv.lib.mkShell {
          inherit inputs;
          pkgs = nixpkgs.legacyPackages.${system};
          modules = [ ./devenv.nix ];
        };
    };
}
