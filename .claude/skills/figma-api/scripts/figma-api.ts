import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

type FigmaNode = {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  fills?: unknown[];
  strokes?: unknown[];
  effects?: unknown[];
  style?: Record<string, unknown>;
  layoutMode?: string;
  primaryAxisSizingMode?: string;
  counterAxisSizingMode?: string;
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  characters?: string;
};

type FigmaFileResponse = {
  name: string;
  document: FigmaNode;
  components?: Record<string, unknown>;
  componentSets?: Record<string, unknown>;
  styles?: Record<string, unknown>;
};

type FigmaNodesResponse = {
  nodes: Record<
    string,
    {
      document: FigmaNode;
      components?: Record<string, unknown>;
      componentSets?: Record<string, unknown>;
      styles?: Record<string, unknown>;
    } | null
  >;
};

type FigmaImagesResponse = {
  images: Record<string, string | null>;
  err?: string;
};

const apiKey = process.env.FIGMA_API_KEY;

if (!apiKey) {
  console.error("Missing FIGMA_API_KEY environment variable.");
  process.exit(1);
}

const baseUrl = "https://api.figma.com/v1";

async function figmaFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "X-Figma-Token": apiKey ?? "",
    },
  });

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `Figma API request failed: ${response.status} ${response.statusText}\n${text}`,
    );
  }

  return response.json() as Promise<T>;
}

function normalizeNodeId(nodeId: string): string {
  return nodeId.replaceAll("-", ":");
}

function safeFileName(value: string): string {
  return value.replace(/[^a-z0-9._-]/gi, "_").toLowerCase();
}

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function walkNodes(node: FigmaNode, visitor: (node: FigmaNode) => void): void {
  visitor(node);

  for (const child of node.children ?? []) {
    walkNodes(child, visitor);
  }
}

function summarizeNode(node: FigmaNode): Record<string, unknown> {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    size: node.absoluteBoundingBox
      ? {
          width: node.absoluteBoundingBox.width,
          height: node.absoluteBoundingBox.height,
        }
      : undefined,
    layoutMode: node.layoutMode,
    primaryAxisSizingMode: node.primaryAxisSizingMode,
    counterAxisSizingMode: node.counterAxisSizingMode,
    text: node.characters,
    childCount: node.children?.length ?? 0,
  };
}

function collectDesignTokens(file: FigmaFileResponse): Record<string, unknown> {
  const colors = new Map<string, unknown>();
  const typography = new Map<string, unknown>();
  const effects = new Map<string, unknown>();
  const layouts = new Map<string, unknown>();

  walkNodes(file.document, (node) => {
    if (node.fills && node.fills.length > 0) {
      colors.set(`${node.id}:${node.name}:fills`, node.fills);
    }

    if (node.strokes && node.strokes.length > 0) {
      colors.set(`${node.id}:${node.name}:strokes`, node.strokes);
    }

    if (node.style) {
      typography.set(`${node.id}:${node.name}:style`, node.style);
    }

    if (node.effects && node.effects.length > 0) {
      effects.set(`${node.id}:${node.name}:effects`, node.effects);
    }

    if (node.layoutMode) {
      layouts.set(`${node.id}:${node.name}:layout`, {
        layoutMode: node.layoutMode,
        primaryAxisSizingMode: node.primaryAxisSizingMode,
        counterAxisSizingMode: node.counterAxisSizingMode,
      });
    }
  });

  return {
    fileName: file.name,
    styles: file.styles ?? {},
    components: file.components ?? {},
    componentSets: file.componentSets ?? {},
    extracted: {
      colors: Object.fromEntries(colors),
      typography: Object.fromEntries(typography),
      effects: Object.fromEntries(effects),
      layouts: Object.fromEntries(layouts),
    },
  };
}

async function getFile(fileKey: string): Promise<void> {
  const file = await figmaFetch<FigmaFileResponse>(
    `/files/${encodeURIComponent(fileKey)}`,
  );

  printJson(file);
}

async function getNodes(fileKey: string, nodeIdsArg: string): Promise<void> {
  const nodeIds = nodeIdsArg.split(",").map(normalizeNodeId).join(",");
  const nodes = await figmaFetch<FigmaNodesResponse>(
    `/files/${encodeURIComponent(fileKey)}/nodes?ids=${encodeURIComponent(
      nodeIds,
    )}`,
  );

  printJson(nodes);
}

async function getImages(
  fileKey: string,
  nodeIdsArg: string,
  format = "png",
): Promise<void> {
  const nodeIds = nodeIdsArg.split(",").map(normalizeNodeId).join(",");
  const images = await figmaFetch<FigmaImagesResponse>(
    `/images/${encodeURIComponent(fileKey)}?ids=${encodeURIComponent(
      nodeIds,
    )}&format=${encodeURIComponent(format)}`,
  );

  printJson(images);
}

async function downloadImages(
  fileKey: string,
  nodeIdsArg: string,
  format = "png",
  outDir = "./figma-assets",
): Promise<void> {
  const nodeIds = nodeIdsArg.split(",").map(normalizeNodeId);
  const images = await figmaFetch<FigmaImagesResponse>(
    `/images/${encodeURIComponent(fileKey)}?ids=${encodeURIComponent(
      nodeIds.join(","),
    )}&format=${encodeURIComponent(format)}`,
  );

  await mkdir(outDir, { recursive: true });

  for (const [nodeId, url] of Object.entries(images.images)) {
    if (!url) {
      console.warn(`No image URL returned for node ${nodeId}`);
      continue;
    }

    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Failed to download ${nodeId}: ${response.statusText}`);
      continue;
    }

    const arrayBuffer = await response.arrayBuffer();
    const fileName = `${safeFileName(nodeId)}.${format}`;
    const filePath = join(outDir, fileName);

    await writeFile(filePath, Buffer.from(arrayBuffer));

    console.log(filePath);
  }
}

async function getComponents(fileKey: string): Promise<void> {
  const file = await figmaFetch<FigmaFileResponse>(
    `/files/${encodeURIComponent(fileKey)}`,
  );

  printJson({
    fileName: file.name,
    components: file.components ?? {},
    componentSets: file.componentSets ?? {},
  });
}

async function getStyles(fileKey: string): Promise<void> {
  const file = await figmaFetch<FigmaFileResponse>(
    `/files/${encodeURIComponent(fileKey)}`,
  );

  printJson({
    fileName: file.name,
    styles: file.styles ?? {},
  });
}

async function getTokens(fileKey: string): Promise<void> {
  const file = await figmaFetch<FigmaFileResponse>(
    `/files/${encodeURIComponent(fileKey)}`,
  );

  printJson(collectDesignTokens(file));
}

async function summarizeFile(fileKey: string): Promise<void> {
  const file = await figmaFetch<FigmaFileResponse>(
    `/files/${encodeURIComponent(fileKey)}`,
  );

  const nodes: Record<string, unknown>[] = [];

  walkNodes(file.document, (node) => {
    nodes.push(summarizeNode(node));
  });

  printJson({
    fileName: file.name,
    pageCount: file.document.children?.length ?? 0,
    totalNodeCount: nodes.length,
    pages:
      file.document.children?.map((page) => ({
        id: page.id,
        name: page.name,
        type: page.type,
        childCount: page.children?.length ?? 0,
      })) ?? [],
    topLevelFrames:
      file.document.children?.flatMap((page) =>
        (page.children ?? []).map((child) => ({
          page: page.name,
          ...summarizeNode(child),
        })),
      ) ?? [],
    componentsCount: Object.keys(file.components ?? {}).length,
    componentSetsCount: Object.keys(file.componentSets ?? {}).length,
    stylesCount: Object.keys(file.styles ?? {}).length,
  });
}

function printHelp(): void {
  const executable = basename(process.argv[1] ?? "figma-api.ts");

  console.log(`
Figma API CLI

Usage:
  ${executable} file <fileKey>
  ${executable} nodes <fileKey> <nodeIds>
  ${executable} images <fileKey> <nodeIds> <format>
  ${executable} download <fileKey> <nodeIds> <format> <outDir>
  ${executable} components <fileKey>
  ${executable} styles <fileKey>
  ${executable} tokens <fileKey>
  ${executable} summarize <fileKey>

Examples:
  ${executable} file abc123xyz
  ${executable} nodes abc123xyz 1:2,3:4
  ${executable} images abc123xyz 1:2 svg
  ${executable} download abc123xyz 1:2 png ./figma-assets
  ${executable} tokens abc123xyz
  ${executable} summarize abc123xyz
`);
}

async function main(): Promise<void> {
  const [command, fileKey, nodeIds, format, outDir] = process.argv.slice(2);

  if (!command || !fileKey) {
    printHelp();
    process.exit(1);
  }

  switch (command) {
    case "file":
      await getFile(fileKey);
      break;

    case "nodes":
      if (!nodeIds) {
        throw new Error("Missing nodeIds argument.");
      }

      await getNodes(fileKey, nodeIds);
      break;

    case "images":
      if (!nodeIds) {
        throw new Error("Missing nodeIds argument.");
      }

      await getImages(fileKey, nodeIds, format);
      break;

    case "download":
      if (!nodeIds) {
        throw new Error("Missing nodeIds argument.");
      }

      await downloadImages(fileKey, nodeIds, format, outDir);
      break;

    case "components":
      await getComponents(fileKey);
      break;

    case "styles":
      await getStyles(fileKey);
      break;

    case "tokens":
      await getTokens(fileKey);
      break;

    case "summarize":
      await summarizeFile(fileKey);
      break;

    default:
      printHelp();
      process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});