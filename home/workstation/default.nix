# Home-manager workstation profile — coordinates all workstation home modules.
{
  lib,
  config,
  pkgs,
  user,
  ...
}:
{
  options.l7v.home.workstation = {
    enable = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = "Enable the workstation home-manager profile.";
    };

    # Offensive security tools are powerful and not needed on every machine.
    # Set to true explicitly in host config or user config to include them.
    enableSecurityTools = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = ''
        Install offensive/penetration-testing tools (sqlmap, nikto, hydra, john,
        aircrack-ng, hashcat, gobuster, masscan, wireshark-cli).
        Disabled by default — enable only on machines designated for security work.
      '';
    };
  };

  config = lib.mkIf config.l7v.home.workstation.enable {
    home = {
      username = user;
      homeDirectory = "/home/${user}";
      stateVersion = "25.05";
    };

    # Standard developer directory layout
    home.activation.createDevDirs = lib.hm.dag.entryAfter [ "writeBoundary" ] ''
      mkdir -p ~/dev/{learning/{books,courses,tutorials},projects/{company/{active,archived},personal,oss},sandboxes/{labs,playgrounds},tools/{bin,configs,scripts},workspaces}
    '';

    home.packages =
      with pkgs;
      [
        # Media
        mpv
        vlc
        ffmpeg

        # Browsers
        firefox
        google-chrome
        mullvad-browser

        # Productivity / notes
        obsidian
        apostrophe
        zettlr

        # Communication
        discord
        telegram-desktop

        # Downloads
        qbittorrent

        # File managers
        nautilus
        thunar
        kdePackages.dolphin
        kdePackages.kdialog
        kdePackages.kio-extras
        kdePackages.ffmpegthumbs
        gvfs
        file-roller
        zoxide

        # Nautilus enhancements
        sushi # quick preview (space key)
        nautilus-python
        gnome-tweaks

        # Icon and theme packs
        papirus-icon-theme
        adwaita-icon-theme
        gnome-themes-extra

        # Terminal file manager
        yazi
        chafa # image preview in terminal
        exiftool
        poppler-utils # PDF preview
        mediainfo

        # System monitoring
        inxi
        powertop

        # Filesystem utilities
        btrfs-progs
        e2fsprogs
        exfatprogs
        ntfs3g
        nfs-utils

        # Archive tools
        p7zip
        unrar
        xz
        zstd

        # Networking
        nmap
        nettools
        iproute2
        ethtool
        whois
        bind
        sshfs
        rsync

        # Editors and IDEs
        # vscode managed via programs.vscode in home/profiles/vscode.nix
        # git managed via programs.git in home/profiles/git.nix
        gcc
        perl
        jetbrains.idea
        zed-editor

        # Fonts
        noto-fonts
        noto-fonts-color-emoji
        dejavu_fonts
        fira-code

        # Database GUI
        dbeaver-bin

        # AI / ML tooling
        python3Packages.huggingface-hub
      ]
      ++ lib.optionals config.l7v.home.workstation.enableSecurityTools [
        # Offensive security / penetration testing tools.
        # Enable via: l7v.home.workstation.enableSecurityTools = true;
        sqlmap
        nikto
        hydra
        john
        aircrack-ng
        wireshark-cli
        tcpdump
        masscan
        gobuster
        hashcat
      ];
  };
}
