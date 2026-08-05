# Home profile: KiroCrew — AI Agent Orchestration Desktop Application
{ pkgs, ... }:
let
  kiro-crew = pkgs.appimageTools.wrapType2 {
    pname = "kiro-crew";
    version = "1.0.0";

    src = pkgs.fetchurl {
      url = "https://download.crew.kiro.dev/desktop/stable/latest/KiroCrew-x86_64.AppImage";
      sha256 = "0xpi4m21s77967vrcnl285r6yd3w4kxg8s76bmm65vgvy58vdi01";
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
        libx11
        libxcb
        libxcomposite
        libxcursor
        libxdamage
        libxext
        libxfixes
        libxi
        libxrandr
        libxrender
        libxtst
        libxkbfile
        libxshmfence
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
