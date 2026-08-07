# Qoder CLI — pre-built binary derivation.
#
# Upstream releases: https://qoder-ide.oss-accelerate.aliyuncs.com/qodercli/channels/manifest.json
#
# Updating to a new version:
#   1. Check the manifest URL above for the latest version + sha256 values.
#   2. Compute the nix-store hash:
#        nix-prefetch-url --unpack <linux-x64-url>
#   3. Update `version`, `url`, and `sha256` below.
#   4. Validate: ./scripts/validate.sh L7V
{
  lib,
  stdenv,
  fetchurl,
  autoPatchelfHook,
}:

stdenv.mkDerivation rec {
  pname = "qoder-cli";
  version = "1.1.17";

  src = fetchurl {
    url = "https://qoder-ide.oss-accelerate.aliyuncs.com/qodercli/releases/${version}/qodercli-linux-x64.tar.gz";
    sha256 = "1fjjr8k12zq82g0lx7qmc0fwrhiiilvjyhvw05rn8w369pwa9hkg";
  };

  nativeBuildInputs = [ autoPatchelfHook ];

  # The tarball unpacks directly to ./qodercli — override sourceRoot.
  sourceRoot = ".";

  installPhase = ''
    runHook preInstall
    install -Dm755 qodercli $out/bin/qodercli
    runHook postInstall
  '';

  meta = with lib; {
    description = "Qoder AI terminal coding assistant";
    homepage = "https://qoder.com/cli";
    license = licenses.unfree;
    platforms = [ "x86_64-linux" ];
    mainProgram = "qodercli";
  };
}
