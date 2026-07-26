# Backup capability: restic (S3 veya SFTP) + snapper (local Btrfs snapshots)
# Requires: secrets
{ lib, config, pkgs, ... }:
let
  cfg = config.l7v.backup;

  # Backend'e göre restic repository URL'i
  repositoryUrl =
    if cfg.backend == "s3"
    then "s3:s3.amazonaws.com/${cfg.s3.bucket}/${cfg.s3.prefix}"
    else cfg.sftp.repository;
in
{
  options.l7v.backup = {
    enable = lib.mkEnableOption "restic backup capability";

    backend = lib.mkOption {
      type    = lib.types.enum [ "s3" "sftp" ];
      default = "s3";
      description = "Restic backend: s3 (AWS S3) veya sftp (fiziksel backup node)";
    };

    s3 = {
      bucket = lib.mkOption {
        type    = lib.types.str;
        default = "l7v-backups";
        description = "S3 bucket adı";
      };
      prefix = lib.mkOption {
        type    = lib.types.str;
        default = "restic";
        description = "S3 obje prefix (klasör)";
      };
      region = lib.mkOption {
        type    = lib.types.str;
        default = "eu-central-1";
        description = "AWS region";
      };
    };

    sftp = {
      repository = lib.mkOption {
        type    = lib.types.str;
        default = "sftp:backup@backup.l7v.dev:/srv/restic";
        description = "SFTP restic repository URL";
      };
    };

    paths = lib.mkOption {
      type    = lib.types.listOf lib.types.str;
      default = [ "/var/lib" "/etc" "/home" ];
      description = "Yedeklenecek dizinler";
    };

    snapperEnable = lib.mkEnableOption "btrfs snapshots via snapper" // { default = true; };
  };

  config = lib.mkIf cfg.enable {
    assertions = [
      { assertion = config.l7v.secrets.enable;
        message   = "l7v.backup requires l7v.secrets.enable = true"; }
    ];

    # Restic şifresi — her iki backend için de gerekli
    sops.secrets."backup/restic_password" = {};

    # AWS credentials — sadece S3 backend için
    sops.secrets."aws/access_key_id"     = lib.mkIf (cfg.backend == "s3") {};
    sops.secrets."aws/secret_access_key" = lib.mkIf (cfg.backend == "s3") {};

    services.restic.backups."l7v" = {
      repository   = repositoryUrl;
      paths        = cfg.paths;
      passwordFile = config.sops.secrets."backup/restic_password".path;

      # S3 için AWS credentials env var olarak geçirilir
      environmentFile = lib.mkIf (cfg.backend == "s3") "/run/restic-s3-env";

      # restic AWS_ACCESS_KEY_ID_FILE okuyamaz, activation ile env dosyası üretilir
      timerConfig = {
        OnCalendar = "daily";
        Persistent = true;
      };

      pruneOpts = [
        "--keep-daily 7"
        "--keep-weekly 4"
        "--keep-monthly 6"
      ];
    };

    # S3 için AWS credentials'ı restic servisine env olarak enjekte eden activation script
    system.activationScripts.resticS3Env = lib.mkIf (cfg.backend == "s3") {
      deps = [ "setupSecrets" ];
      text = ''
        KEY_ID=$(cat ${config.sops.secrets."aws/access_key_id".path})
        SECRET=$(cat ${config.sops.secrets."aws/secret_access_key".path})
        printf 'AWS_ACCESS_KEY_ID=%s\nAWS_SECRET_ACCESS_KEY=%s\nAWS_DEFAULT_REGION=${cfg.s3.region}\n' \
          "$KEY_ID" "$SECRET" > /run/restic-s3-env
        chmod 400 /run/restic-s3-env
      '';
    };

    # S3 env dosyasını servisin EnvironmentFile'ı olarak ayarla
    systemd.services."restic-backups-l7v" = lib.mkIf (cfg.backend == "s3") {
      serviceConfig.EnvironmentFile = "/run/restic-s3-env";
    };

    services.snapper = lib.mkIf cfg.snapperEnable {
      configs.root = {
        SUBVOLUME               = "/";
        ALLOW_USERS             = [];
        TIMELINE_CREATE         = true;
        TIMELINE_DELETE_CLEANUP = true;
        TIMELINE_CLEANUP        = true;
        TIMELINE_MIN_AGE        = 1800;
        TIMELINE_LIMIT_HOURLY   = 10;
        TIMELINE_LIMIT_DAILY    = 10;
        TIMELINE_LIMIT_WEEKLY   = 0;
        TIMELINE_LIMIT_MONTHLY  = 10;
        TIMELINE_LIMIT_YEARLY   = 10;
      };
    };

    environment.systemPackages = with pkgs; [
      restic
      awscli2  # S3 bucket kontrol, presigned URL vs
    ] ++ lib.optionals cfg.snapperEnable [
      snapper
      btrfs-progs
    ];
  };
}
