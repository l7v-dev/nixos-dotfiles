# Home profile: Kiro IDE — Spec-Driven AI Development IDE
{ pkgs, ... }:
let
  kiro-ide = pkgs.stdenv.mkDerivation {
    pname = "kiro-ide";
    version = "1.0.242";

    src = builtins.path {
      path = "/home/l7v/İndirilenler/kiro-ide-1.0.242-stable-linux-x64.deb";
      name = "kiro-ide-deb";
    };

    nativeBuildInputs = with pkgs; [
      dpkg
      autoPatchelfHook
      makeWrapper
    ];

    buildInputs = with pkgs; [
      stdenv.cc.cc
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
      libdrm
      libgbm
      nss
      nspr
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
      libglvnd
      vulkan-loader
    ];

    unpackPhase = ''
      runHook preUnpack
      dpkg-deb -x $src .
      runHook postUnpack
    '';

    installPhase = ''
      runHook preInstall

      mkdir -p $out/bin $out/share/kiro $out/share/applications $out/share/icons/hicolor/512x512/apps

      cp -r usr/share/kiro/* $out/share/kiro/
      if [ -d usr/share/applications ]; then
        cp -r usr/share/applications/* $out/share/applications/ 2>/dev/null || true
      fi
      if [ -d usr/share/pixmaps ]; then
        cp -r usr/share/pixmaps/* $out/share/icons/hicolor/512x512/apps/ 2>/dev/null || true
      fi

      if [ -f $out/share/applications/kiro.desktop ]; then
        substituteInPlace $out/share/applications/kiro.desktop \
          --replace-fail "/usr/share/kiro/kiro" "$out/bin/kiro"
      fi

      if [ -f $out/share/applications/kiro-url-handler.desktop ]; then
        substituteInPlace $out/share/applications/kiro-url-handler.desktop \
          --replace-fail "/usr/share/kiro/kiro" "$out/bin/kiro"
      fi

      makeWrapper $out/share/kiro/kiro $out/bin/kiro \
        --add-flags "--ozone-platform-hint=auto" \
        --prefix LD_LIBRARY_PATH : "${
          pkgs.lib.makeLibraryPath [
            pkgs.libglvnd
            pkgs.vulkan-loader
            pkgs.mesa
          ]
        }"

      runHook postInstall
    '';

    meta = with pkgs.lib; {
      description = "Kiro AI IDE - Spec-driven development IDE";
      homepage = "https://kiro.dev";
      platforms = [ "x86_64-linux" ];
    };
  };
in
{
  home.packages = [ kiro-ide ];
}
