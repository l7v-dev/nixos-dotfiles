# Host: builder — CI + binary cache
{ lib, host, user, roles, tags, ... }:
{
  networking.hostName = "builder";
  system.stateVersion = "25.05";

  l7v.platform.ci.enable = true;

  nix.settings = {
    experimental-features = [ "nix-command" "flakes" ];
    auto-optimise-store   = true;
    max-jobs              = "auto";
    cores                 = 0;
    trusted-users         = [ "root" "@wheel" ];
  };

  nix.gc = {
    automatic = true;
    dates     = "weekly";
    options   = "--delete-older-than 30d";
  };

  l7v.identity.sshKeys = [
    # TODO: CI deploy key ekle
    # "ssh-ed25519 AAAA... ci@l7v"
  ];
}
