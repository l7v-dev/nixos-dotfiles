{ pkgs, ... }:

# Wayland utility packages and clipboard history service for Niri.
{
  # Cursor teması home/profiles/theme.nix'te tanımlı (tek otorite).

  home.packages = with pkgs; [
    brightnessctl
    fuzzel
    grim
    kitty
    pavucontrol
    playerctl
    slurp
    wev
    wl-clipboard
    xwayland-satellite
  ];

  # Clipboard history service setup.
  services.cliphist.enable = true;

  systemd.user.services.wl-paste-to-cliphist = {
    Unit = {
      Description = "Pipe wl-paste output to cliphist";
      After = [ "graphical-session.target" ];
      PartOf = [ "graphical-session.target" ];
    };
    Install.WantedBy = [ "graphical-session.target" ];
    Service = {
      Type = "simple";
      ExecStart = "${pkgs.wl-clipboard}/bin/wl-paste --watch ${pkgs.cliphist}/bin/cliphist store";
      Restart = "on-failure";
    };
  };
}
