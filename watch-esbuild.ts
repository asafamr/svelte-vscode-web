import * as esbuild from "esbuild";

import { readdirSync, readFileSync } from "fs";
import path from "path";

// this plugin loads js files from the module_shims dirs and use them as modules
const moduleShimmerName = "ModuleShimmer";
const moduleShimmer: esbuild.Plugin = {
  name: moduleShimmerName,
  setup(build: esbuild.PluginBuild) {
    // https://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    function escapeRegex(string) {
      return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    }

    const moduleShims = Object.fromEntries(
      readdirSync(path.resolve(__dirname, "module_shims")).map((filename) => [
        filename.replace(".ts", ""),
        readFileSync(path.resolve(__dirname, "module_shims", filename)).toString(),
      ])
    );

    for (const mod of Object.keys(moduleShims)) {
      build.onResolve({ filter: new RegExp("^" + escapeRegex(mod) + "$") }, (args) => ({
        path: mod,
        namespace: moduleShimmerName,
      }));
    }

    build.onLoad({ filter: /.*/, namespace: moduleShimmerName }, (args) => {
      const contents = moduleShims[args.path];
      return { contents, loader: "ts", resolveDir: "node_modules" };
    });
  },
};

esbuild.build({
  entryPoints: ["src/web/extension.ts"],
  outdir: "dist/web/",
  bundle: true,
  format: "cjs",
  external: ["vscode"],
  sourcemap: "inline",
  platform: "browser",
  sourcesContent: true,
  // plugins: [moduleShimmer],
  watch: {
    onRebuild(error, result) {
      if (error) console.error("watch build failed:", JSON.stringify(error));
      else console.log("watch build succeeded:", JSON.stringify(result));
    },
  },
});
esbuild.build({
  entryPoints: ["src/web/server.ts"],
  outdir: "dist/web/",
  bundle: true,
  format: "iife",
  // external: ["vscode"],
  sourcemap: "inline",
  // sourcesContent: false,
  // inject:["src/web/shim_injected.ts"],
  define: { global: "self", __dirname: '""', define: "null", window: "self", 'Function':"errorOnFunction" },
  platform: "browser",
  plugins: [moduleShimmer],
  // banner:{js:'self.require=getRequireShim();'},
  watch: {
    onRebuild(error, result) {
      if (error) console.error("watch build failed:", JSON.stringify(error));
      else console.log("watch build succeeded:", JSON.stringify(result));
    },
  },
});
