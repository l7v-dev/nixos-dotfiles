# mkWorkstation: unstable + niri + Noctalia + home-manager
{
  pkgs,
  lib ? pkgs.lib,
  inputs,
  homeManager,
  sops,
  host,
  user,
  system ? "x86_64-linux",
}:
let
  hostDir = ./../hosts/${host};
  homeDir = ./../home;
in
lib.nixosSystem {
  inherit system;
  specialArgs = { inherit user inputs host; };
  modules = [
    sops
    homeManager
    inputs.niri-flake.nixosModules.niri
    ../infrastructure
    ../experience
    ../capabilities
    ../services
    ../platform
    (hostDir + "/default.nix")
    (hostDir + "/hardware.nix")
    {
      nixpkgs.pkgs = import pkgs {
        inherit system;
        config = {
          allowUnfree = true;
          permittedInsecurePackages = [
            "librewolf-151.0.2-1"
            "librewolf-unwrapped-151.0.2-1"
          ];
        };
      };
    }
    (_: {
      l7v.identity.user = user;
      l7v.infrastructure.isServer = false;
      home-manager = {
        useGlobalPkgs = true;
        useUserPackages = true;
        # Timestamped backups to avoid clobbering existing .*-bak files
        backupCommand = ''
          mv "$1" "$1.bak-$(date +%Y%m%d-%H%M%S)"
        '';
        extraSpecialArgs = { inherit user inputs; };
        users.${user} = {
          imports = [
            (homeDir + "/workstation/default.nix")
            (homeDir + "/profiles/shell.nix")
            (homeDir + "/profiles/git.nix")
            (homeDir + "/profiles/ssh.nix")
            (homeDir + "/profiles/niri")
            # (homeDir + "/profiles/hyprland.nix")
            (homeDir + "/profiles/yazi.nix")
            (homeDir + "/profiles/dev.nix")
            (homeDir + "/profiles/noctalia.nix")
            (homeDir + "/profiles/theme.nix")
            (homeDir + "/profiles/vscode.nix")
            (homeDir + "/profiles/cursor.nix")
            (homeDir + "/profiles/antigravity.nix")
            (homeDir + "/profiles/kiro-ide.nix")
            (homeDir + "/profiles/kiro-crew.nix")
          ];
        };
      };
    })
  ];
}
