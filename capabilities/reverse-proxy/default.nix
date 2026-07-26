# Reverse proxy capability: nginx + ACME
{ lib, config, ... }:
{
  options.l7v.reverseProxy = {
    enable = lib.mkEnableOption "nginx reverse-proxy capability";
    acmeEmail = lib.mkOption {
      type    = lib.types.str;
      default = "ops@l7v.dev";
    };
  };

  config = lib.mkIf config.l7v.reverseProxy.enable {
    security.acme = {
      acceptTerms = true;
      defaults.email = lib.mkDefault config.l7v.reverseProxy.acmeEmail;
    };

    services.nginx = {
      enable         = true;
      recommendedTlsSettings = true;
      recommendedOptimisation = true;
      recommendedProxySettings = true;
      virtualHosts = {
        # Localhost default — service'ler kendi host'larını ekler
        "localhost" = {
          listen = [{ addr = "127.0.0.1"; port = 80; }];
        };
      };
    };
  };
}
