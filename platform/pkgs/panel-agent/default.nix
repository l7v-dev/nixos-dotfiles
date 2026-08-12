{ pkgs, ... }:

pkgs.buildGoModule rec {
  pname = "panel-agent";
  version = "0.1.0";

  src = ../../l7v-panel/agent;

  vendorHash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

  nativeBuildInputs = [ pkgs.installShellFiles ];

  ldflags = [
    "-s"
    "-w"
    "-X main.version=${version}"
  ];

  subPackages = [ "cmd/panel-agent" ];

  meta = with pkgs.lib; {
    description = "L7V Panel Agent - System control via D-Bus";
    homepage = "https://github.com/l7v/nixos";
    license = licenses.mit;
    maintainers = [ ];
  };
}
