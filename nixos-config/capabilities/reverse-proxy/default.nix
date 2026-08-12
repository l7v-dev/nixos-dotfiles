# Reverse proxy capability: nginx with ACME-managed TLS.
{ lib, config, ... }:
{
  options.l7v.reverseProxy = {
    enable = lib.mkEnableOption "nginx reverse-proxy capability";

    acmeEmail = lib.mkOption {
      type = lib.types.str;
      default = "ops@l7v.dev";
      description = "Contact address registered with the ACME provider.";
    };

    statusPath = lib.mkOption {
      type = lib.types.str;
      default = "/nginx_status";
      description = ''
        Loopback location serving nginx stub_status. The metrics capability
        points the nginx exporter at this path.
      '';
    };
  };

  config = lib.mkIf config.l7v.reverseProxy.enable {
    security.acme = {
      acceptTerms = true;
      defaults.email = lib.mkDefault config.l7v.reverseProxy.acmeEmail;
    };

    services.nginx = {
      enable = true;
      recommendedTlsSettings = true;
      recommendedOptimisation = true;
      recommendedProxySettings = true;

      # Loopback default server exposing stub_status. Public virtual hosts are
      # registered by the individual service modules.
      virtualHosts.localhost = {
        listen = [
          {
            addr = "127.0.0.1";
            port = 80;
          }
        ];

        locations.${config.l7v.reverseProxy.statusPath}.extraConfig = ''
          stub_status;
          access_log off;
        '';
      };
    };

    # 80 carries ACME HTTP-01 validation and the TLS redirect; 443 serves traffic.
    networking.firewall.allowedTCPPorts = [
      80
      443
    ];
  };
}
