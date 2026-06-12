---
name: figma-api
description: Use the Figma REST API to inspect Figma files, retrieve nodes, export assets, extract design information, and help implement designs in code.
---

# Figma API Skill

Use this skill when the user wants to work with Figma files using a Figma API key instead of a Figma MCP server.

This skill can:

- Fetch Figma files by file key
- Fetch specific Figma nodes
- Inspect frames, pages, components, and styles
- Export selected nodes as PNG, JPG, SVG, or PDF
- Download exported assets
- Extract text, colors, layout, typography, and spacing information
- Generate implementation guidance from Figma designs
- Compare Figma design structure with local code

## Requirements

The user must have a Figma API token available as:

```bash
FIGMA_API_KEY
```

Optional environment variables:

```bash
FIGMA_TEAM_ID
FIGMA_PROJECT_ID
```

## How to identify a Figma file key

Given a Figma URL like:

```text
https://www.figma.com/design/abc123xyz/My-File?node-id=1-2
```

The file key is:

```text
abc123xyz
```

The node ID is:

```text
1:2
```

Figma URLs often encode node IDs as `1-2`, but the API expects `1:2`.

## Available script

Use the script at:

```text
scripts/figma-api.ts
```

The script supports these commands:

```bash
npm run figma -- file <fileKey>
npm run figma -- nodes <fileKey> <nodeIds>
npm run figma -- images <fileKey> <nodeIds> <format>
npm run figma -- download <fileKey> <nodeIds> <format> <outDir>
npm run figma -- components <fileKey>
npm run figma -- styles <fileKey>
npm run figma -- tokens <fileKey>
npm run figma -- summarize <fileKey>
```

Examples:

```bash
npm run figma -- file abc123xyz
npm run figma -- nodes abc123xyz 1:2,3:4
npm run figma -- images abc123xyz 1:2 svg
npm run figma -- download abc123xyz 1:2,3:4 png ./figma-assets
npm run figma -- tokens abc123xyz
npm run figma -- summarize abc123xyz
```

## Usage guidance for Claude

When the user provides a Figma URL:

1. Extract the file key.
2. Extract the node ID if present.
3. Convert node ID dashes to colons.
4. Use the appropriate script command.

For a full-file inspection:

```bash
npm run figma -- summarize <fileKey>
```

For a selected frame or component:

```bash
npm run figma -- nodes <fileKey> <nodeId>
```

For asset export:

```bash
npm run figma -- download <fileKey> <nodeId> svg ./figma-assets
```

## Important limitations

The Figma REST API does not provide every feature that a Figma MCP server may expose.

Possible limitations:

- No live cursor/session awareness
- No direct access to the user's current Figma selection unless node IDs are provided
- No live design editing unless using supported write APIs
- Some plugin-only data may not be available
- Complex auto-layout interpretation may require additional processing

When exact fidelity is not possible, explain the limitation and provide the closest available API-based workflow.

## Recommended workflow

If the user asks to implement a design:

1. Ask for the Figma URL.
2. Extract file key and node ID.
3. Fetch the selected node.
4. Export the node as SVG or PNG for visual reference.
5. Inspect layout, text, fills, strokes, effects, constraints, and styles.
6. Generate frontend implementation.
7. Compare generated code against the Figma structure.
8. Suggest refinements.

## Security

Never print the full Figma API key.

If the key is missing, tell the user to set:

```bash
export FIGMA_API_KEY="figma_api_key"
```