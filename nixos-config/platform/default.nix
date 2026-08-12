# Platform: developer platform modules.
#
# Qoder IDE is a workstation-only package — it must not be installed on servers.
# The isServer flag from infrastructure/default.nix gates the derivation.
{
  lib,
  config,
  pkgs,
  ...
}:
let
  qoderPkg = pkgs.callPackage ./pkgs/qoder { };
in
{
  imports = [
    ./ci
    ./deploy
    ./recovery
    ./documentation
    ./inventory
    ./fhs.nix
  ];

  # Qoder is a GUI IDE — only meaningful on workstations.
  environment.systemPackages = lib.mkIf (!config.l7v.infrastructure.isServer) [
    qoderPkg
  ];
}
