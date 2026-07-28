# Platform: cross-cutting platform seviyesi konfig
{ pkgs, ... }:
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

  environment.systemPackages = [
    qoderPkg
  ];
}
