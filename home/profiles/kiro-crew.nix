# Home profile: KiroCrew — AI Agent Orchestration Desktop Application
{ pkgs, ... }:
let
  kiro-crew = pkgs.appimageTools.wrapType2 {
    pname = "kiro-crew";
    version = "1.0.0";

    src = builtins.path {
      path = "/home/l7v/İndirilenler/KiroCrew-x86_64.AppImage";
      name = "KiroCrew.AppImage";
    };

    extraPkgs =
      pkgs: with pkgs; [
        libglvnd
        vulkan-loader
        mesa
        alsa-lib
        at-spi2-atk
        at-spi2-core
        cairo
        cups
        dbus
        expat
        gdk-pixbuf
        glib
        gtk3
        nspr
        nss
        pango
        systemd
        xorg.libX11
        xorg.libxcb
        xorg.libXcomposite
        xorg.libXcursor
        xorg.libXdamage
        xorg.libXext
        xorg.libXfixes
        xorg.libXi
        xorg.libXrandr
        xorg.libXrender
        xorg.libXtst
        xorg.libxkbfile
        xorg.libxshmfence
        libxkbcommon
      ];

    extraInstallCommands = ''
            mkdir -p $out/share/applications

            cat <<EOF > $out/share/applications/kiro-crew.desktop
      [Desktop Entry]
      Name=KiroCrew
      Comment=AI Agent Orchestration Platform
      Exec=$out/bin/kiro-crew %F
      Icon=kirocrew-electron-mac
      Type=Application
      Categories=Development;IDE;AI;
      Terminal=false
      StartupWMClass=kirocrew-electron-mac
      EOF
    '';
  };
in
{
  home.packages = [ kiro-crew ];
}
