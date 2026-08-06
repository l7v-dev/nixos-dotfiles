# Kiro CLI — agentic AI coding assistant for the terminal.
#
# Replaces: curl -fsSL https://cli.kiro.dev/install | bash
#
# The official install script writes to ~/.local/bin and relies on the FHS
# dynamic linker. Neither works on NixOS. This derivation extracts the .deb
# archive and patches all ELF binaries via autoPatchelfHook.
#
# Updating to a new version:
#   1. Fetch the manifest:
#        curl -fsSL https://prod.download.cli.kiro.dev/stable/latest/manifest.json | jq
#   2. Grab "download" and "sha256" for the x86_64 .deb entry.
#   3. Convert the hex sha256 to Nix SRI format:
#        python3 -c "import base64,binascii; print('sha256-'+base64.b64encode(binascii.unhexlify('<HEX>')).decode())"
#   4. Update version, url, sha256 below and run: ./scripts/validate.sh L7V
{
  lib,
  stdenv,
  fetchurl,
  dpkg,
  autoPatchelfHook,
  makeWrapper,
  # Electron / Node runtime dependencies
  alsa-lib,
  at-spi2-atk,
  at-spi2-core,
  cairo,
  cups,
  dbus,
  expat,
  gdk-pixbuf,
  glib,
  gtk3,
  libdrm,
  libgbm,
  nss,
  nspr,
  pango,
  systemd,
  libx11,
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
  libxkbcommon,
  libxkbfile,
  libxshmfence,
  libglvnd,
  vulkan-loader,
  mesa,
  libsecret,
  libcap,
  gsettings-desktop-schemas,
  xdg-utils,
}:
stdenv.mkDerivation rec {
  pname = "kiro-cli";
  version = "2.16.1";

  src = fetchurl {
    # Source: https://prod.download.cli.kiro.dev/stable/latest/manifest.json
    # Entry:  kind=deb, fileType=deb, variant=full, arch=x86_64
    url = "https://prod.download.cli.kiro.dev/stable/${version}/kiro-cli.deb";
    # Hex from manifest.json converted to Nix SRI:
    #   python3 -c "import base64,binascii; print('sha256-'+base64.b64encode(binascii.unhexlify('4ae6066860dab736ef0909a86e7c301922e2adca206ab759081e62ff4209b2fc')).decode())"
    sha256 = "sha256-SuYGaGDatzbvCQmobnwwGSLircogardZCB5i/0IJsvw=";
  };

  nativeBuildInputs = [
    dpkg
    autoPatchelfHook
    makeWrapper
  ];

  buildInputs = [
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
    libxkbcommon
    libxkbfile
    libxshmfence
    libglvnd
    vulkan-loader
    mesa
    libsecret
    libcap
    gsettings-desktop-schemas
  ];

  unpackPhase = ''
    runHook preUnpack
    # Extract without preserving setuid bits (Nix sandbox disallows them)
    dpkg-deb --fsys-tarfile $src | tar xf - --no-same-permissions
    runHook postUnpack
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p $out/bin $out/share/kiro-cli $out/share/applications $out/share/icons/hicolor/512x512/apps

    # The .deb installs to /usr/bin and /usr/share — copy everything
    cp -r usr/share/kiro-cli/* $out/share/kiro-cli/ 2>/dev/null || true

    if [ -d usr/share/applications ]; then
      cp -r usr/share/applications/* $out/share/applications/ 2>/dev/null || true
    fi
    if [ -d usr/share/pixmaps ]; then
      cp -r usr/share/pixmaps/* $out/share/icons/hicolor/512x512/apps/ 2>/dev/null || true
    fi

    # Patch desktop entry paths
    for f in $out/share/applications/*.desktop; do
      [ -f "$f" ] && substituteInPlace "$f" \
        --replace-fail "/usr/bin/kiro-cli" "$out/bin/kiro-cli" \
        --replace-fail "/usr/share/kiro-cli/kiro-cli" "$out/bin/kiro-cli" || true
    done

    # Find the real executable (may be kiro-cli or kiro-cli-bin)
    exe=""
    for candidate in \
      $out/share/kiro-cli/kiro-cli \
      $out/share/kiro-cli/bin/kiro-cli \
      usr/bin/kiro-cli; do
      if [ -f "$candidate" ]; then
        exe="$candidate"
        break
      fi
    done

    if [ -z "$exe" ]; then
      echo "ERROR: kiro-cli executable not found in extracted .deb" >&2
      find . -name "kiro-cli" -o -name "kiro-cli-bin" 2>/dev/null | head -10 >&2
      exit 1
    fi

    makeWrapper "$exe" "$out/bin/kiro-cli" \
      --prefix PATH : "${lib.makeBinPath [ xdg-utils ]}" \
      --prefix XDG_DATA_DIRS : "${gsettings-desktop-schemas}/share/gsettings-schemas/${gsettings-desktop-schemas.name}" \
      --prefix XDG_DATA_DIRS : "${gtk3}/share/gsettings-schemas/${gtk3.name}" \
      --prefix LD_LIBRARY_PATH : "${
        lib.makeLibraryPath [
          libglvnd
          vulkan-loader
          mesa
          libsecret
          libcap
        ]
      }"

    # Convenience alias so `kiro` also works at the terminal
    ln -s $out/bin/kiro-cli $out/bin/kiro

    runHook postInstall
  '';

  meta = with lib; {
    description = "Kiro CLI — agentic AI coding assistant for the terminal";
    homepage = "https://kiro.dev/cli/";
    license = licenses.unfree;
    platforms = [ "x86_64-linux" ];
    mainProgram = "kiro-cli";
  };
}
