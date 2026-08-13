# panel-agent Go binary derivation.
# Source: local l7v-panel/apps/agent/ directory in this repository.
#
# Updating dependencies:
#   cd l7v-panel/apps/agent
#   go mod tidy
#   gomod2nix generate   # regenerates gomod2nix.toml
#   Update vendorHash below with the output.
{
  lib,
  buildGoModule,
}:

buildGoModule rec {
  pname = "panel-agent";
  version = "0.1.0";

  # Source points to the local agent source tree.
  # nix build always uses the working-tree version.
  src = lib.cleanSource ../../../apps/agent;

  # Populated after running: cd l7v-panel/apps/agent && gomod2nix generate
  # Set to null initially; replace with the sha256 from gomod2nix generate output.
  vendorHash = null;

  # Inject version at build time.
  ldflags = [
    "-s"
    "-w"
    "-X main.version=${version}"
  ];

  meta = with lib; {
    description = "panel-agent: REST/SSE system management API for l7v-panel";
    license = licenses.mit;
    mainProgram = "panel-agent";
    platforms = [
      "x86_64-linux"
      "aarch64-linux"
    ];
  };
}
