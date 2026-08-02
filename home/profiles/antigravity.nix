# Home profile: Antigravity IDE — Agentic Development Platform & MCP Runtime Ecosystem
{ pkgs, ... }:
{
  home.packages =
    (
      if (pkgs ? antigravity-ide-fhs) then
        [ pkgs.antigravity-ide-fhs ]
      else if (pkgs ? antigravity-fhs) then
        [ pkgs.antigravity-fhs ]
      else if (pkgs ? antigravity) then
        [ pkgs.antigravity ]
      else
        [ ]
    )
    ++ (with pkgs; [
      # Node.js & Package Managers (chrome-devtools-mcp, postman, context, visualization)
      nodejs_22
      bun

      # Python Runtime & Notebook Support (notebooks MCP)
      python3
      python3Packages.ipykernel

      # Diagram & Rendering Engine (visualization MCP)
      graphviz

      # Database CLI Tools (clickhouse MCP)
      clickhouse
    ]);

  # Environment Variables for MCP Integrations & GCP Region (Frankfurt: europe-west3)
  home.sessionVariables = {
    CHROME_PATH = "${pkgs.ungoogled-chromium}/bin/chromium";
    PUPPETEER_EXECUTABLE_PATH = "${pkgs.ungoogled-chromium}/bin/chromium";
    PLAYWRIGHT_BROWSERS_PATH = "${pkgs.playwright-driver.browsers}";
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";

    # GCP Region & Zone (Frankfurt, Germany)
    REGION = "europe-west3";
    CLOUDSDK_COMPUTE_REGION = "europe-west3";
    CLOUDSDK_COMPUTE_ZONE = "europe-west3-a";
  };
}
