# System-wide Universal FHS Runner Module
{ pkgs, ... }:
let
  fhsRunner = pkgs.buildFHSEnv {
    name = "fhs-run";
    targetPkgs =
      pkgs:
      (with pkgs; [
        alsa-lib
        at-spi2-atk
        at-spi2-core
        cairo
        cups
        dbus
        expat
        fontconfig
        freetype
        gdk-pixbuf
        glib
        gtk3
        gtk4
        nspr
        nss
        openssl
        pango
        systemd
        udev
        mesa
        vulkan-loader
        libdrm
        libxkbcommon
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
        zlib
        fuse3
        curl
      ]);
    runScript = "$@";
  };
in
{
  environment.systemPackages = [ fhsRunner ];
}
