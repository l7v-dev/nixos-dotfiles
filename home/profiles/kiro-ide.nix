# Home profile: Kiro IDE — Spec-Driven AI Development IDE
{ pkgs, ... }:
let
  kiro-ide = pkgs.stdenv.mkDerivation {
    pname = "kiro-ide";
    version = "1.0.242";

    src = pkgs.fetchurl {
      url = "https://prod.download.desktop.kiro.dev/releases/stable/linux-x64/signed/1.0.242/deb/kiro-ide-1.0.242-stable-linux-x64.deb";
      sha256 = "1r22d97ivh7kx70nqs7hmhswrqkn8hwrx4hh45xfiq8rf1wih8ki";
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
      libglvnd
      vulkan-loader
      # Kiro için gerekli ek bağımlılıklar (autoPatchelf tarafından tespit edildi)
      webkitgtk_4_1
      libsoup_3
      libsecret
      libcap
      gsettings-desktop-schemas
    ];

    unpackPhase = ''
      runHook preUnpack
      # chrome-sandbox setuid bitini atlayarak aç (Nix sandbox izin vermiyor)
      dpkg-deb --fsys-tarfile $src | tar xf - --no-same-permissions
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
        --set ELECTRON_USE_PORTAL "1" \
        --prefix PATH : "${
          pkgs.lib.makeBinPath [
            pkgs.zenity
            pkgs.kdePackages.kdialog
            pkgs.kdePackages.dolphin
            pkgs.nautilus
            pkgs.xdg-utils
          ]
        }" \
        --prefix XDG_DATA_DIRS : "${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}" \
        --prefix XDG_DATA_DIRS : "${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}" \
        --prefix LD_LIBRARY_PATH : "${
          pkgs.lib.makeLibraryPath [
            pkgs.libglvnd
            pkgs.vulkan-loader
            pkgs.mesa
            pkgs.libsecret
            pkgs.libcap
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
