# Security: ssh hardening, fail2ban, auditd, sysctl, CA kök sertifikaları / PKI
{ lib, config, ... }:
{
  options.l7v.security.pki = {
    enable = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = "Özel CA kök sertifikaları ve PKI güven deposu desteği";
    };
    certificateFiles = lib.mkOption {
      type = lib.types.listOf lib.types.path;
      default = [ ];
      description = "Sistem güven deposuna eklenecek ek CA kök sertifika dosyaları (.crt/.pem)";
    };
    certificates = lib.mkOption {
      type = lib.types.listOf lib.types.str;
      default = [ ];
      description = "Sistem güven deposuna eklenecek ek CA kök sertifika metin blokları (PEM)";
    };
  };

  config = {
    # CA Kök Sertifikaları (PKI Trust Store)
    security.pki = lib.mkIf config.l7v.security.pki.enable {
      certificateFiles = config.l7v.security.pki.certificateFiles;
      certificates = config.l7v.security.pki.certificates;
    };

    # SSH — sadece server'larda açık
    # Workstation'da SSH kapalı; açmak istersen host config'de override et.
    # BUG-007: koşulsuz enable kaldırıldı
    services.openssh = lib.mkIf config.l7v.infrastructure.isServer {
      enable = true;
      settings = {
        PasswordAuthentication = false;
        KbdInteractiveAuthentication = false;
        PermitRootLogin = "prohibit-password";
        X11Forwarding = false;
      };
      openFirewall = true;
    };

    # Fail2ban — sadece server'larda anlamlı
    services.fail2ban.enable = lib.mkIf config.l7v.infrastructure.isServer true;

    # Sysctl hardening — her iki tip için geçerli
    boot.kernel.sysctl = {
      "net.ipv4.conf.all.rp_filter" = 1;
      "net.ipv4.conf.default.rp_filter" = 1;
      "net.ipv4.icmp_echo_ignore_broadcasts" = 1;
      "net.ipv4.conf.all.accept_redirects" = 0;
      "net.ipv6.conf.all.accept_redirects" = 0;
      "net.ipv4.conf.all.send_redirects" = 0;
      "net.ipv4.conf.all.accept_source_route" = 0;
      "net.ipv6.conf.all.accept_source_route" = 0;
    };
  };
}
