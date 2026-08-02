# Host: backup — restic SFTP target node
{
  user,
  ...
}:
{
  networking.hostName = "backup";
  system.stateVersion = "25.05";

  # Backup node'una SSH erişimi — mkServer isServer=true ayarlar,
  # bu yüzden security.nix zaten SSH'ı açar. Burada sadece key'leri tanımlıyoruz.
  l7v.identity.sshKeys = [
    # TODO: restic client public key ekle (bootstrap.sh ile üretilir)
    # "ssh-ed25519 AAAA... restic@l7v"
  ];

  # Restic repository dizini /srv/backup üzerinde — hardware.nix'te mount edilmiş
  # Dizin ve izinler activation'da oluşturulur.
  systemd.tmpfiles.rules = [
    "d /srv/backup       0750 ${user} users -"
    "d /srv/backup/restic 0750 ${user} users -"
  ];
}
