# MCP servers

`.mcp.json` (Claude Code) and `.vscode/mcp.json` (VS Code) start empty. Add
matching entries in both files when a dependency ships an MCP server, so
both editors see the same tools. Example (trigger.dev):

`.mcp.json`:
```json
{
  "mcpServers": {
    "trigger": { "command": "npx", "args": ["trigger.dev@4.4.4", "mcp"] }
  }
}
```

`.vscode/mcp.json`:
```json
{
  "servers": {
    "trigger": { "command": "npx", "args": ["trigger.dev@4.4.4", "mcp"] }
  }
}
```
