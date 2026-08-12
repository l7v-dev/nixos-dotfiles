{ ... }:

# Niri window manager configuration coordinator.
# Imports packages module and assembles the final KDL config from fragments.
{
  imports = [ ./packages.nix ];

  xdg.configFile."niri/config.kdl" = {
    force = true;
    text = builtins.concatStringsSep "\n" [
      (import ./input.nix)
      (import ./layout.nix)
      (import ./animations.nix)
      (import ./workspaces.nix)
      (import ./rules.nix)
      (import ./binds.nix)
    ];
  };
}
