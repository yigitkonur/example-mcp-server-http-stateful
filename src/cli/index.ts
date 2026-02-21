#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { cp, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

interface InitOptions {
  force: boolean;
  sdkMode: 'vendored' | 'registry';
  targetBaseDir: string;
}

interface TemplateVariables {
  PROJECT_NAME: string;
  SDK_SERVER_DEP: string;
  SDK_NODE_DEP: string;
}

function printUsage(): void {
  console.log(`mcp-http-stateful-starter

Usage:
  mcp-http-stateful-starter init <project-name> [--force] [--sdk vendored|registry] [--dir <path>]

Examples:
  mcp-http-stateful-starter init my-mcp-app
  mcp-http-stateful-starter init my-mcp-app --sdk registry
  mcp-http-stateful-starter init my-mcp-app --dir ./playground --force`);
}

function sanitizePackageName(rawName: string): string {
  return rawName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function parseInitOptions(args: string[]): InitOptions {
  const options: InitOptions = {
    force: false,
    sdkMode: 'vendored',
    targetBaseDir: process.cwd(),
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--force') {
      options.force = true;
      continue;
    }

    if (token === '--sdk') {
      const mode = args[index + 1];
      if (mode !== 'vendored' && mode !== 'registry') {
        throw new Error('Invalid --sdk value. Use "vendored" or "registry".');
      }
      options.sdkMode = mode;
      index += 1;
      continue;
    }

    if (token === '--dir') {
      const target = args[index + 1];
      if (!target) {
        throw new Error('Missing value for --dir.');
      }
      options.targetBaseDir = path.resolve(target);
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${token}`);
  }

  return options;
}

async function ensureTargetDir(targetDir: string, force: boolean): Promise<void> {
  const exists = existsSync(targetDir);
  if (!exists) {
    await mkdir(targetDir, { recursive: true });
    return;
  }

  const items = await readdir(targetDir);
  if (items.length > 0 && !force) {
    throw new Error(`Target directory is not empty: ${targetDir}. Use --force to continue.`);
  }
}

function packageRootFromImportMeta(metaUrl: string): string {
  const currentDir = path.dirname(fileURLToPath(metaUrl));
  return path.resolve(currentDir, '../..');
}

async function copyTemplate(
  templateDir: string,
  targetDir: string,
  variables: TemplateVariables,
): Promise<void> {
  const entries = await readdir(templateDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(templateDir, entry.name);

    if (entry.isDirectory()) {
      const childTarget = path.join(targetDir, entry.name);
      await mkdir(childTarget, { recursive: true });
      await copyTemplate(sourcePath, childTarget, variables);
      continue;
    }

    const targetName = entry.name.endsWith('.tmpl')
      ? entry.name.slice(0, -'.tmpl'.length)
      : entry.name;
    const targetPath = path.join(targetDir, targetName);

    if (!entry.name.endsWith('.tmpl')) {
      await cp(sourcePath, targetPath, { force: true });
      continue;
    }

    const content = await readFile(sourcePath, 'utf8');
    const rendered = content
      .replaceAll('__PROJECT_NAME__', variables.PROJECT_NAME)
      .replaceAll('__SDK_SERVER_DEP__', variables.SDK_SERVER_DEP)
      .replaceAll('__SDK_NODE_DEP__', variables.SDK_NODE_DEP);

    await writeFile(targetPath, rendered, 'utf8');
  }
}

async function copyVendoredSdkAssets(packageRoot: string, targetDir: string): Promise<void> {
  const sourceSdkDir = path.join(packageRoot, 'vendor', 'mcp-sdk-v2');
  const sdkStats = await stat(sourceSdkDir).catch(() => undefined);

  if (!sdkStats?.isDirectory()) {
    throw new Error(
      `Vendored SDK assets not found at ${sourceSdkDir}. ` +
        'Use --sdk registry or add tarballs under vendor/mcp-sdk-v2.',
    );
  }

  const destination = path.join(targetDir, 'vendor', 'mcp-sdk-v2');
  await mkdir(destination, { recursive: true });
  await cp(sourceSdkDir, destination, { recursive: true, force: true });
}

async function initProject(projectNameArg: string, options: InitOptions): Promise<void> {
  const projectName = sanitizePackageName(projectNameArg);
  if (!projectName) {
    throw new Error('Project name must include at least one alphanumeric character.');
  }

  const packageRoot = packageRootFromImportMeta(import.meta.url);
  const targetDir = path.resolve(options.targetBaseDir, projectName);
  const templateDir = path.join(packageRoot, 'templates', 'http-stateful');

  await ensureTargetDir(targetDir, options.force);

  let sdkServerDep = '2.0.0-alpha.0';
  let sdkNodeDep = '2.0.0-alpha.0';

  if (options.sdkMode === 'vendored') {
    await copyVendoredSdkAssets(packageRoot, targetDir);
    sdkServerDep = 'file:vendor/mcp-sdk-v2/modelcontextprotocol-server-2.0.0-alpha.0.tgz';
    sdkNodeDep = 'file:vendor/mcp-sdk-v2/modelcontextprotocol-node-2.0.0-alpha.0.tgz';
  }

  await copyTemplate(templateDir, targetDir, {
    PROJECT_NAME: projectName,
    SDK_SERVER_DEP: sdkServerDep,
    SDK_NODE_DEP: sdkNodeDep,
  });

  console.log(`\nCreated ${projectName} at ${targetDir}\n`);
  console.log('Next steps:');
  console.log(`  cd ${projectName}`);
  console.log('  npm install');
  console.log('  npm run dev');
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);

  if (!command || command === '--help' || command === '-h') {
    printUsage();
    return;
  }

  if (command !== 'init') {
    throw new Error(`Unknown command: ${command}`);
  }

  const projectName = rest[0];
  if (!projectName || projectName.startsWith('--')) {
    throw new Error('Missing project name.');
  }

  const options = parseInitOptions(rest.slice(1));
  await initProject(projectName, options);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
