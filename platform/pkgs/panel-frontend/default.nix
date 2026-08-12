# panel-frontend Next.js 16 derivation.
# Source: local l7v-panel/ monorepo root in this repository.
#
# Updating pnpm dependency hash:
#   nix run nixpkgs#prefetch-pnpm-deps -- l7v-panel/apps/web/pnpm-lock.yaml
#   Update pnpmDeps.hash below with the printed sha256.
#
# Requires next.config.ts to have output: "standalone".
{
  lib,
  stdenv,
  nodejs_22,
  pnpm_9,
  makeWrapper,
}:

stdenv.mkDerivation rec {
  pname = "panel-frontend";
  version = "0.1.0";

  # Source is the full monorepo root (needed for pnpm workspace resolution).
  src = lib.cleanSource ../../../l7v-panel;

  nativeBuildInputs = [
    nodejs_22
    pnpm_9
    makeWrapper
  ];

  # Pre-fetch pnpm deps offline.
  # Hash: run `nix run nixpkgs#prefetch-pnpm-deps -- l7v-panel/apps/web/pnpm-lock.yaml`
  pnpmDeps = pnpm_9.fetchDeps {
    inherit pname version src;
    # Set to null initially; replace after running prefetch-pnpm-deps.
    hash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  };

  buildPhase = ''
    runHook preBuild
    export HOME=$TMPDIR
    # Install dependencies from the offline store.
    pnpm install --frozen-lockfile --offline
    # Build only the web app workspace.
    pnpm --filter @l7v-panel/web run build
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    mkdir -p $out

    # Next.js standalone output bundles server.js and all required node_modules.
    cp -r apps/web/.next/standalone/. $out/

    # Static assets must be copied separately (Next.js standalone omits them).
    mkdir -p $out/apps/web/.next
    cp -r apps/web/.next/static $out/apps/web/.next/static

    # Public directory (favicon, robots.txt, etc.).
    if [ -d apps/web/public ]; then
      cp -r apps/web/public $out/apps/web/public
    fi

    # Wrap server.js so it can be executed directly with Node.js in PATH.
    wrapProgram $out/apps/web/server.js \
      --prefix PATH : ${lib.makeBinPath [ nodejs_22 ]}

    runHook postInstall
  '';

  meta = with lib; {
    description = "panel-frontend: Next.js 16 web UI for l7v-panel";
    license = licenses.mit;
    mainProgram = "server.js";
    platforms = [
      "x86_64-linux"
      "aarch64-linux"
    ];
  };
}
