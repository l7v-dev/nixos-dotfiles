# Qoder IDE Nix Package Derivation
{
  lib,
  stdenv,
  fetchurl,
  rpm,
  cpio,
  autoPatchelfHook,
  wrapGAppsHook3,
  alsa-lib,
  at-spi2-atk,
  at-spi2-core,
  cairo,
  cups,
  dbus,
  expat,
  fontconfig,
  freetype,
  gdk-pixbuf,
  glib,
  gtk3,
  nspr,
  nss,
  pango,
  systemd,
  udev,
  mesa,
  libdrm,
  libxkbcommon,
  libxkbfile,
  libX11,
  libxcb,
  libxcomposite,
  libxcursor,
  libxdamage,
  libxext,
  libxfixes,
  libxi,
  libxrandr,
  libxrender,
  libxtst,
  useLocalSrc ? false,
  localSrcPath ? ./qoder_x86_64.rpm,
}:

stdenv.mkDerivation rec {
  pname = "qoder";
  version = "latest";

  src =
    if useLocalSrc then
      localSrcPath
    else
      fetchurl {
        url = "https://download.qoder.com/release/latest/qoder_x86_64.rpm";
        sha256 = "0pvi130yx61np94yxw8757fj1s30gcnfrnj3rzbk98hc693574rg";
      };

  nativeBuildInputs = [
    rpm
    cpio
    autoPatchelfHook
    wrapGAppsHook3
  ];

  buildInputs = [
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
    nspr
    nss
    pango
    systemd
    udev
    mesa
    libdrm
    libxkbcommon
    libxkbfile
    libX11
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
  ];

  unpackPhase = ''
    rpm2cpio $src | cpio -idm --no-preserve-owner || true
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p $out/bin $out/share
    cp -r usr/share/qoder $out/share/

    chmod 4755 $out/share/qoder/chrome-sandbox || chmod 0755 $out/share/qoder/chrome-sandbox

    if [ -d usr/share/applications ]; then
      cp -r usr/share/applications $out/share/
      for f in $out/share/applications/*.desktop; do
        if [ -f "$f" ]; then
          substituteInPlace "$f" \
            --replace "/usr/share/qoder/bin/qoder" "$out/bin/qoder" \
            --replace "/usr/share/qoder/qoder" "$out/bin/qoder" || true
        fi
      done
    fi

    if [ -d usr/share/pixmaps ]; then
      cp -r usr/share/pixmaps $out/share/
    fi

    if [ -f $out/share/qoder/bin/qoder ]; then
      ln -s $out/share/qoder/bin/qoder $out/bin/qoder
    else
      ln -s $out/share/qoder/qoder $out/bin/qoder
    fi

    runHook postInstall
  '';

  meta = with lib; {
    description = "Qoder AI Agentic IDE Environment";
    homepage = "https://qoder.ai";
    license = licenses.unfree;
    platforms = [ "x86_64-linux" ];
    mainProgram = "qoder";
  };
}
