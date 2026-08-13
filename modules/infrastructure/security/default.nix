# Security: SSH hardening, fail2ban, sysctl kernel hardening, custom PKI trust store.
#
# SSH and fail2ban are enabled on servers only; workstations are not exposed
# to inbound SSH by default (override in host config if needed).
{ lib, config, ... }:
{
  options.l7v.security.pki = {
    enable = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = "Custom CA root certificate and PKI trust store support.";
    };
    certificateFiles = lib.mkOption {
      type = lib.types.listOf lib.types.path;
      default = [ ];
      description = "Additional CA root certificate files (.crt/.pem) added to the system trust store.";
    };
    certificates = lib.mkOption {
      type = lib.types.listOf lib.types.str;
      default = [ ];
      description = "Additional CA root certificate PEM blocks added to the system trust store.";
    };
  };

  config = {
    security.pki = lib.mkIf config.l7v.security.pki.enable {
      certificateFiles = config.l7v.security.pki.certificateFiles;
      certificates = config.l7v.security.pki.certificates;
    };

    # SSH is only enabled on servers; workstations keep port 22 closed.
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

    # fail2ban only makes sense on internet-facing servers.
    services.fail2ban.enable = lib.mkIf config.l7v.infrastructure.isServer true;

    # Sysctl hardening — applied to all host types.
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
