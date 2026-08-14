# panel-agent Go binary derivation.
# Source: local l7v-panel/apps/agent/ directory in this repository.
#
# Updating dependencies:
#   cd l7v-panel/apps/agent
#   go mod tidy
#   gomod2nix generate   # regenerates gomod2nix.toml
#   nix build .#panel-agent  # verify build succeeds
{
  lib,
  buildGoApplication,
  systemd,
  pkg-config,
}:

buildGoApplication rec {
  pname = "panel-agent";
  version = "0.1.0";

  # Source points to the local agent source tree.
  # nix build always uses the working-tree version.
  src = lib.cleanSource ../../../apps/agent;

  # gomod2nix.toml is read by buildGoApplication for reproducible Go builds.
  # Regenerate with: cd apps/agent && gomod2nix generate
  modules = ./gomod2nix.toml;

  # CGO dependencies: go-systemd requires sd-journal.h from systemd dev headers and libsystemd.so.
  nativeBuildInputs = [ pkg-config ];
  buildInputs = [
    (lib.getDev systemd)
    (lib.getLib systemd)
  ];

  CGO_ENABLED = 1;
  CGO_CFLAGS = "-I${lib.getDev systemd}/include";
  CGO_LDFLAGS = "-L${lib.getLib systemd}/lib -Wl,-rpath,${lib.getLib systemd}/lib -lsystemd";

  preCheck = ''
    export LD_LIBRARY_PATH="${lib.getLib systemd}/lib''${LD_LIBRARY_PATH:+:$$LD_LIBRARY_PATH}"
  '';

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
