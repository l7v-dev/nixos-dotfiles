# Notifications: libnotify CLI + Noctalia kendi daemon'ını yönetiyor
# Not: Mako eklenmedi — Noctalia v5 kendi notification daemon'ını içeriyor
# (notification.enable_daemon = true noctalia.nix'te). İki daemon çakışır.
{ lib, config, pkgs, ... }:
{
  options.l7v.experience.notifications = lib.mkEnableOption "notification support";

  config = lib.mkIf config.l7v.experience.notifications {
    environment.systemPackages = with pkgs; [
      libnotify   # notify-send CLI — script ve uygulama bildirimler için
    ];
  };
}
