# Platform Documentation: Runbook ve operasyon kılavuzlarını
# /etc/l7v/runbooks altına koyar; sysadmin araçlarını PATH'e ekler.
{ lib, config, pkgs, ... }:
{
  options.l7v.platform.documentation = {
    enable = lib.mkEnableOption "operational runbooks and docs";
  };

  config = lib.mkIf config.l7v.platform.documentation.enable {
    environment.systemPackages = with pkgs; [
      man-pages
      man-pages-posix
      tldr
      jq
      yq-go
    ];

    # Runbook dosyaları /etc/l7v/runbooks altında (Google Documentation Standards)
    environment.etc = {
      "l7v/runbooks/deploy-guide.md".text = builtins.readFile ./../../docs/runbooks/deploy-guide.md;
      "l7v/runbooks/secrets-management.md".text = builtins.readFile ./../../docs/runbooks/secrets-management.md;
      "l7v/runbooks/disaster-recovery.md".text = builtins.readFile ./../../docs/runbooks/disaster-recovery.md;
      "l7v/runbooks/service-operations.md".text = builtins.readFile ./../../docs/runbooks/service-operations.md;
      "l7v/runbooks/developer-workflows.md".text = builtins.readFile ./../../docs/runbooks/developer-workflows.md;
    };
  };
}
