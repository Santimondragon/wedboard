# Figma API Claude Code Skill

This skill lets Claude Code interact with Figma through the Figma REST API using a Figma API key.

## Setup

Install dependencies:

```bash
npm install
```

Set your Figma API key:

```bash
export FIGMA_API_KEY="figd_your_token_here"
```

## Usage

Fetch a full Figma file:

```bash
npm run figma -- file abc123xyz
```

Fetch one or more nodes:

```bash
npm run figma -- nodes abc123xyz 1:2,3:4
```

Export image URLs:

```bash
npm run figma -- images abc123xyz 1:2 svg
```

Download exported assets:

```bash
npm run figma -- download abc123xyz 1:2 png ./figma-assets
```

Extract rough design tokens:

```bash
npm run figma -- tokens abc123xyz
```

Summarize the file:

```bash
npm run figma -- summarize abc123xyz
```

## URL parsing

For a URL like:

```text
https://www.figma.com/design/abc123xyz/File-Name?node-id=1-2
```

Use:

```bash
npm run figma -- nodes abc123xyz 1:2
```

## Limitations

This uses the public Figma REST API. It cannot perfectly replace every possible MCP behavior, but it covers most useful design-inspection and asset-export workflows.