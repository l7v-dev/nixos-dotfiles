# Home profile: KiroCrew — AI Agent Orchestration Desktop Application
#
# KiroCrew'in bundled Python backend'i, başlangıçta deploy skill'lerini
# ~/.kiro/crew/skills/ altına shutil.copytree ile kopyalar ve ardından
# .kirocrew-managed marker dosyası yazar. Ancak Nix store (read-only) kaynaklı
# copytree, hedef dizini de salt okunur oluşturur → PermissionError.
#
# Çözüm: activation script'te skill dizinlerini marker OLMADAN önceden oluştururuz.
# Marker olmayan dizinleri KiroCrew "kullanıcı yönetimli" sayarak atlar → crash yok.
{ pkgs, lib, ... }:
let
  appSrc = pkgs.fetchurl {
    url = "https://download.crew.kiro.dev/desktop/stable/latest/KiroCrew-x86_64.AppImage";
    sha256 = "0xpi4m21s77967vrcnl285r6yd3w4kxg8s76bmm65vgvy58vdi01";
  };

  # extractType2: AppImage içeriğini Nix store'a çıkarır.
  # wrapType2 ile aynı src → aynı store hash → aynı yol.
  extracted = pkgs.appimageTools.extractType2 {
    pname = "kiro-crew";
    version = "1.0.0";
    src = appSrc;
  };

  # KiroCrew'in Python backend'inin deploy skill kaynak dizini
  skillsSrc = "${extracted}/resources/backend-dist/kirocrew-backend/lib/python3.12/site-packages/kiro_crew/deploy/skills";

  kiro-crew = pkgs.appimageTools.wrapType2 {
    pname = "kiro-crew";
    version = "1.0.0";
    src = appSrc;

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

  # KiroCrew başlangıcında deploy skill'lerini Nix store'dan ~/.kiro/crew/skills/
  # altına kopyalar ve .kirocrew-managed marker yazar. Ancak Nix store salt okunur
  # olduğundan copytree sonrası hedef dizin de salt okunur olur → PermissionError.
  #
  # Çözüm: Skill dizinlerini --no-preserve=mode ile yazılabilir olarak önceden
  # oluştururuz ve marker OLMADAN bırakırız. KiroCrew marker olmayan dizinleri
  # "kullanıcı yönetimli" sayarak kopyalamayı atlar → gateway başarıyla başlar.
  home.activation.setupKiroCrewSkills = lib.hm.dag.entryAfter [ "writeBoundary" ] ''
    mkdir -p "$HOME/.kiro/crew/skills"

    # Her system switch'inde skill dizinlerini Nix store sürümüyle güncelle
    if [ -d "${skillsSrc}" ]; then
      for skill_dir in "${skillsSrc}"/*/; do
        [ -d "$skill_dir" ] || continue
        skill_name=$(basename "$skill_dir")
        dst="$HOME/.kiro/crew/skills/$skill_name"

        # Eski kopyayı temizle ve yazılabilir şekilde yeniden oluştur
        rm -rf "$dst"
        cp -r --no-preserve=mode "$skill_dir" "$dst"
        chmod -R u+w "$dst"

        # .kirocrew-managed marker'ı KALDIR:
        # Marker varlığında KiroCrew dizini siler ve read-only olarak yeniden kopyalar.
        # Marker yoksa "kullanıcı yönetimli" sayarak atlar → crash yok.
        rm -f "$dst/.kirocrew-managed"
      done
    fi
  '';
}
