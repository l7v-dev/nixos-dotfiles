{ pkgs, ... }:

let
  panel-src = ../../l7v-panel;
  
  node-env = pkgs.buildNpmPackage {
    pname = "panel-frontend";
    version = "0.1.0";
    src = panel-src;
    npmDepsHash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    buildInputs = [ pkgs.nodejs_20 ];
    installPhase = ''
      mkdir -p $out/bin
      cp -r apps/web/.next/standalone $out/lib/panel-frontend
      cp -r apps/web/.next/static $out/lib/panel-frontend/apps/web/.next/
      
      cat > $out/bin/panel-frontend << 'EOF'
#!/bin/sh
exec ${pkgs.nodejs_20}/bin/node $out/lib/panel-frontend/apps/web/server.js "$@"
EOF
      chmod +x $out/bin/panel-frontend
    '';
  };
in
node-env
