declare var require: any;
const _self = self as any;
import "./preshim";
//@ts-ignore
import ts from "typescript";
import { createSystem } from "@typescript/vfs";
import { configLoader } from "../../vendored/langauge-tools/packages/language-server/src/lib/documents/configLoader";

// import * as vscode from 'vscode';

// declare var _sltw_req_vscode: typeof import('vscode');

// self.global = self;

// function binder()
import ppts from "svelte-preprocess/dist/processors/typescript";

const conf = { preprocess: [ppts({ tsconfigFile: "/tsconfig.json" })] };

configLoader.getConfig = (x) => conf;
configLoader.awaitConfig = () => Promise.resolve(conf);
configLoader.loadConfigs = () => Promise.resolve();

import { prettier } from "./prettier_fixed";

import { version as prettierVersion } from "prettier/package.json";
import { version as svelteVersion } from "svelte/package.json";
import { version as preprocess_version } from "svelte-preprocess/package.json";

const required = {
  "prettier/package.json": { version: prettierVersion },
  "svelte/package.json": { version: svelteVersion },
  "svelte-preprocess/package.json": { version: preprocess_version },
  "svelte/compiler": require("svelte/compiler"),
  "/prettier": prettier,
  // "postcss":require('postcss'),
  // "/transformers/typescript":require('svelte-preprocess/dist/transformers/typescript'),
  // "/svelte-preprocess":require("svelte-preprocess"),
  // "/transformers/globalStyle": require("svelte-preprocess/dist/transformers/globalStyle")
  // 'svelte/package.json':{version: svelteVersion},
};
const thorwing = {
  "./node_modules/@microsoft/typescript-etw": true,
  "svelte-native/package.json": true
};

_self.require = function (req: string) {
  if (thorwing.hasOwnProperty(req)) throw Error("");
  for (const imp of Object.keys(required)) {
    if (req.endsWith(imp)) return (required as any)[imp];
  }
  // else {
  console.error("dynamic required missing", req);
  // }
};
_self.require.resolve = (x: any) => x;
const fsMap = new Map<string, string>();

// esbuild loader d.ts as raw text
fsMap.set("/lib.es2015.d.ts", require("typescript/lib/lib.es2015.d.ts"));
fsMap.set("/lib.es2015.collection.d.ts", require("typescript/lib/lib.es2015.collection.d.ts"));
fsMap.set("/lib.es2015.core.d.ts", require("typescript/lib/lib.es2015.core.d.ts"));
fsMap.set("/lib.es2015.generator.d.ts", require("typescript/lib/lib.es2015.generator.d.ts"));
fsMap.set("/lib.es2015.iterable.d.ts", require("typescript/lib/lib.es2015.iterable.d.ts"));
fsMap.set("/lib.es2015.promise.d.ts", require("typescript/lib/lib.es2015.promise.d.ts"));
fsMap.set("/lib.es2015.proxy.d.ts", require("typescript/lib/lib.es2015.proxy.d.ts"));
fsMap.set("/lib.es2015.reflect.d.ts", require("typescript/lib/lib.es2015.reflect.d.ts"));
fsMap.set("/lib.es2015.symbol.d.ts", require("typescript/lib/lib.es2015.symbol.d.ts"));
fsMap.set("/lib.es2015.symbol.wellknown.d.ts", require("typescript/lib/lib.es2015.symbol.wellknown.d.ts"));
fsMap.set("/lib.es5.d.ts", require("typescript/lib/lib.es5.d.ts"));
fsMap.set("/lib.dom.d.ts", require("typescript/lib/lib.dom.d.ts"));

fsMap.set("/lib/svelte-shims.d.ts", require("../../vendored/langauge-tools/packages/svelte2tsx/svelte-shims.d.ts"));
fsMap.set("/lib/svelte-jsx.d.ts", require("../../vendored/langauge-tools/packages/svelte2tsx/svelte-jsx.d.ts"));
fsMap.set(
  "/lib/svelte-native-jsx.d.ts",
  require("../../vendored/langauge-tools/packages/svelte2tsx/svelte-native-jsx.d.ts")
);
fsMap.set(
  "/tsconfig.json",
  JSON.stringify({
    compilerOptions: {
      lib: ["DOM", "ES2015"],
      module: "ES6",
      target: "ES6",
      rootDir: "/",
    },
  })
);

//@ts-ignore
ts.sys = createSystem(fsMap);

let dir = "/";
_self.process = {
  cwd: () => dir,
  chdir: (x: string) => (dir = x),
  env: {},
};
export const dummy = 0;
