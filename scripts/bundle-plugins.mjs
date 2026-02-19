#!/usr/bin/env zx

/**
 * bundle-plugins.mjs
 *
 * Bundles OpenClaw plugin packages into build/plugins/ for electron-builder
 * to include in the app resources. At runtime, these are copied to
 * ~/.openclaw/extensions/ so the Gateway can discover them.
 */

import 'zx/globals';

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'build', 'plugins');
const NODE_MODULES = path.join(ROOT, 'node_modules');

// Plugins to bundle: { npmName, pluginId }
const PLUGINS = [
  { npmName: '@art_style666/hi-light', pluginId: 'hi-light' },
];

echo`📦 Bundling OpenClaw plugins...`;

// Clean output
if (fs.existsSync(OUTPUT)) {
  fs.rmSync(OUTPUT, { recursive: true });
}
fs.mkdirSync(OUTPUT, { recursive: true });

for (const { npmName, pluginId } of PLUGINS) {
  const pkgLink = path.join(NODE_MODULES, ...npmName.split('/'));
  if (!fs.existsSync(pkgLink)) {
    echo`   ⚠️  ${npmName} not found in node_modules, skipping`;
    continue;
  }

  const pkgReal = fs.realpathSync(pkgLink);
  const dest = path.join(OUTPUT, pluginId);

  echo`   Copying ${npmName} -> build/plugins/${pluginId}/`;
  fs.cpSync(pkgReal, dest, { recursive: true, dereference: true });

  // Bundle plugin dependencies into plugin's node_modules
  const pluginPkg = JSON.parse(fs.readFileSync(path.join(dest, 'package.json'), 'utf-8'));
  const deps = Object.keys(pluginPkg.dependencies || {});
  if (deps.length > 0) {
    const pluginNodeModules = path.join(dest, 'node_modules');
    fs.mkdirSync(pluginNodeModules, { recursive: true });
    for (const dep of deps) {
      const depLink = path.join(NODE_MODULES, ...dep.split('/'));
      if (!fs.existsSync(depLink)) {
        echo`   ⚠️  dependency ${dep} not found, skipping`;
        continue;
      }
      const depReal = fs.realpathSync(depLink);
      const depDest = path.join(pluginNodeModules, ...dep.split('/'));
      fs.mkdirSync(path.dirname(depDest), { recursive: true });
      fs.cpSync(depReal, depDest, { recursive: true, dereference: true });
      echo`   📎 bundled dependency: ${dep}`;
    }
  }

  // Verify essential files
  const hasManifest = fs.existsSync(path.join(dest, 'openclaw.plugin.json'));
  const hasPkg = fs.existsSync(path.join(dest, 'package.json'));
  const hasDist = fs.existsSync(path.join(dest, 'dist'));

  if (!hasManifest || !hasPkg || !hasDist) {
    echo`   ❌ ${pluginId}: missing essential files (manifest=${hasManifest}, pkg=${hasPkg}, dist=${hasDist})`;
    process.exit(1);
  }

  echo`   ✅ ${pluginId} bundled successfully`;
}

echo``;
echo`✅ All plugins bundled to: ${OUTPUT}`;
