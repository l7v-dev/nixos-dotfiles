# Deneyim: Login ekranı — SDDM Astronaut (Wayland modunda)
{ pkgs, lib, ... }:
{
  environment.systemPackages = with pkgs; [ sddm-astronaut ];

  services.displayManager.sddm = {
    enable = true;
    wayland.enable = true;
    package = pkgs.kdePackages.sddm;
    theme = "sddm-astronaut-theme";
    extraPackages = [ pkgs.sddm-astronaut ];
  };

  services.greetd.enable = lib.mkForce false;
}