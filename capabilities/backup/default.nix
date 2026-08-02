# Backup capability: offsite restic repository (S3 or SFTP).
#
# Local btrfs snapshots are owned by platform/recovery so snapper is configured
# in exactly one place.
{
  lib,
  config,
  pkgs,
  ...
}:
let
  cfg = config.l7v.backup;

  repositoryUrl =
    if cfg.backend == "s3" then
      "s3:s3.amazonaws.com/${cfg.s3.bucket}/${cfg.s3.prefix}"
    else
      cfg.sftp.repository;

  # restic reads credentials from the environment only, so the sops-provided
  # values are materialised into a tmpfs EnvironmentFile during activation.
  s3EnvFile = "/run/restic-s3-env";
in
{
  options.l7v.backup = {
    enable = lib.mkEnableOption "restic backup capability";

    backend = lib.mkOption {
      type = lib.types.enum [
        "s3"
        "sftp"
      ];
      default = "s3";
      description = "Restic backend: S3 bucket or a dedicated SFTP node.";
    };

    s3 = {
      bucket = lib.mkOption {
        type = lib.types.str;
        default = "l7v-backups";
        description = "S3 bucket holding the repository.";
      };
      prefix = lib.mkOption {
        type = lib.types.str;
        default = "restic";
        description = "Object key prefix within the bucket.";
      };
      region = lib.mkOption {
        type = lib.types.str;
        default = "eu-central-1";
        description = "AWS region of the bucket.";
      };
    };

    sftp = {
      repository = lib.mkOption {
        type = lib.types.str;
        default = "sftp:backup@backup.l7v.dev:/srv/restic";
        description = "SFTP repository URL used when backend is \"sftp\".";
      };
    };

    paths = lib.mkOption {
      type = lib.types.listOf lib.types.str;
      default = [
        "/var/lib"
        "/var/backup"
        "/etc"
        "/home"
      ];
      description = ''
        Directories included in each snapshot. /var/backup carries application
        dumps such as the Vaultwarden SQLite export.
      '';
    };

    repositoryUrl = lib.mkOption {
      type = lib.types.str;
      readOnly = true;
      default = repositoryUrl;
      description = "Resolved repository URL, for use by recovery tooling.";
    };
  };

  config = lib.mkIf cfg.enable {
    assertions = [
      {
        assertion = config.l7v.secrets.enable;
        message = "l7v.backup requires l7v.secrets.enable = true";
      }
    ];

    sops.secrets = {
      "backup/restic_password" = { };
      "aws/access_key_id" = lib.mkIf (cfg.backend == "s3") { };
      "aws/secret_access_key" = lib.mkIf (cfg.backend == "s3") { };
    };

    services.restic.backups.l7v = {
      repository = repositoryUrl;
      inherit (cfg) paths;
      passwordFile = config.sops.secrets."backup/restic_password".path;

      # Create the repository on first run; restic otherwise fails until it is
      # initialised out of band.
      initialize = true;

      environmentFile = lib.mkIf (cfg.backend == "s3") s3EnvFile;

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

    system.activationScripts.resticS3Env = lib.mkIf (cfg.backend == "s3") {
      deps = [ "setupSecrets" ];
      text = ''
        umask 077
        printf 'AWS_ACCESS_KEY_ID=%s\nAWS_SECRET_ACCESS_KEY=%s\nAWS_DEFAULT_REGION=%s\n' \
          "$(cat ${config.sops.secrets."aws/access_key_id".path})" \
          "$(cat ${config.sops.secrets."aws/secret_access_key".path})" \
          "${cfg.s3.region}" > ${s3EnvFile}
      '';
    };

    environment.systemPackages =
      with pkgs;
      [
        restic
      ]
      ++ lib.optional (cfg.backend == "s3") awscli2;
  };
}
