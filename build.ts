import * as esbuild from "esbuild";

import { readdirSync, readFileSync } from "fs";
import path from "path";
import { writeFile, readFile, copyFile } from "fs/promises";
import glob from "fast-glob";
const dev = process.argv.includes("--dev");

const sourcesContent = dev;
const sourcemap = dev ? "inline" : false;
const minify = !dev;

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

    // prevents bundling unused parsers
    build.onLoad({ filter: /prettier\/standalone/ }, async (args) => {
      const contentsBuffer = await readFile(args.path);
      const contents = contentsBuffer.toString().replace(/require\(\"/g, 'rekuire("');
      // writeFile('test.js', contents)
      return { contents };
    });

    // w/o this webCustomData.js included twice - as umd and as esm
    build.onResolve({ filter: /.*vscode-html-languageservice.*webCustomData/ }, (args) => {
      return { path: require.resolve("vscode-html-languageservice/lib/esm/languageFacts/data/webCustomData.js") };
    });

    for (const mod of Object.keys(moduleShims)) {
      build.onResolve({ filter: new RegExp("^" + escapeRegex(mod) + "$") }, (args) => ({
        path: mod,
        namespace: moduleShimmerName,
      }));
    }

    build.onLoad({ filter: /\/typescript\/lib\/typescript\.js/ }, async (args) => {
      const contents = await (await readFile(path.resolve(__dirname, "node_modules/typescript/lib/typescript.js")).then(x=>x.toString())).replace(' debugger;','')
      return { contents, loader: "ts", resolveDir: path.resolve(__dirname, "node_modules/typescript/lib/") };
    });

    build.onLoad({ filter: /.*/, namespace: moduleShimmerName }, (args) => {
      const contents = moduleShims[args.path];
      return { contents, loader: "ts", resolveDir: "node_modules" };
    });

  },
};

esbuild
  .build({
    entryPoints: ["src/web/extension.ts"],
    outdir: "dist/web/",
    bundle: true,
    format: "cjs",
    minify,
    external: ["vscode"],
    sourcemap,
    platform: "browser",
    treeShaking: true,
    sourcesContent,
    metafile: !dev,
    plugins: [moduleShimmer],
    watch: dev && {
      onRebuild(error, result) {
        if (error) console.error("watch build failed:", JSON.stringify(error));
        else console.log("watch build succeeded:", JSON.stringify(result));
      },
    },
  })
  .then(async (built) => {
    if (!dev) {
      writeFile(
        "tmp.extstats.txt",
        (await esbuild.analyzeMetafile(built.metafile, { verbose: false })) +
          "\n\n\n" +
          (await esbuild.analyzeMetafile(built.metafile, { verbose: true }))
      );
    }
  });
esbuild
  .build({
    entryPoints: ["src/web/server.ts"],
    outdir: "dist/web/",
    bundle: true,
    minify,
    metafile: !dev,
    format: "iife",
    // external: ["vscode"],
    sourcemap,
    treeShaking: true,
    loader: {
      // ".d.ts": "text",
    },
    sourcesContent,
    // inject:["src/web/shim_injected.ts"],
    define: {
      global: "self",
      __dirname: '""',
      define: "null",
      window: "self",
      Function: "_Function",
      importScripts: "_importScripts",
      Buffer: "_Buffer"
    },
    platform: "browser",
    plugins: [moduleShimmer],
    // banner:{js:'self.require=getRequireShim();'},
    watch: dev && {
      onRebuild(error, result) {
        if (error) console.error("watch build failed:", JSON.stringify(error));
        else console.log("watch build succeeded:", JSON.stringify(result));
      },
    },
  })
  .then(async (built) => {
    copyLibs();
    if (!dev) {
      writeFile(
        "tmp.serverstats.txt",
        (await esbuild.analyzeMetafile(built.metafile, { verbose: false })) +
          "\n\n\n" +
          (await esbuild.analyzeMetafile(built.metafile, { verbose: true }))
      );
    }
  });

async function copyLibs() {
  const libsDir = path.join(__dirname, "dist", "libs");
  const tsLibPath = path.join(__dirname, "node_modules", "typescript", "lib");
  // const svelteTypesPath = path.join(__dirname, "node_modules", "svelte", "types");

  const allLibs = {svelte:{}, svelte2tsx:{}, tslibs:{}}
  for(const filename of await glob('**/*.d.ts', {cwd:path.join(__dirname, "node_modules/svelte")})){
    allLibs.svelte[filename] =  (await readFile(path.join(__dirname, "node_modules/svelte",filename))).toString()
  }
  for(const filename of await glob('svelte*.d.ts', {cwd:path.join(__dirname, "vendored/langauge-tools/packages/svelte2tsx")})){
    allLibs.svelte2tsx[filename] =  (await readFile(path.join(__dirname, "vendored/langauge-tools/packages/svelte2tsx",filename))).toString()
  }
  for(const filename of await glob('lib*.d.ts', {cwd:path.join(__dirname, "node_modules", "typescript", "lib")})){
    allLibs.tslibs[filename] =  (await readFile(path.join(__dirname, "node_modules", "typescript", "lib", filename))).toString()
  }

  await writeFile( path.join(__dirname, "dist/allLibs.json"),JSON.stringify(allLibs));
  await copyFile(
    path.join(__dirname, "vendored/langauge-tools/packages/svelte-vscode/syntaxes/svelte.tmLanguage.json"),
    path.join(__dirname, "dist/svelte.tmLanguage.json")
  );
  await copyFile(
    path.join(__dirname, "vendored/langauge-tools/packages/svelte-vscode/language-configuration.json"),
    path.join(__dirname, "dist/language-configuration.json")
  );
}
