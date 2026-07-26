# Screencast: pipewire screen capture + kayıt araçları
# Not: xdg.portal ve pipewire zaten experience/desktop/niri ve audio capability'sinde
# tanımlı. Burada sadece ekstra araçlar ve obs-studio ekleniyor.
{ lib, config, pkgs, ... }:
{
  options.l7v.experience.screencast = lib.mkEnableOption "screencast / screen sharing";

  config = lib.mkIf config.l7v.experience.screencast {
    environment.systemPackages = with pkgs; [
      obs-studio   # kayıt / streaming
      wf-recorder  # hafif Wayland ekran kaydı (CLI)
    ];
  };
}
