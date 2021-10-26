declare var require: any;
const _self = self as any;
import "./preshim";
//@ts-ignore
import ts from "typescript";
import { createSystem } from "../../vendored/tsvfs";
import { configLoader } from "../../vendored/langauge-tools/packages/language-server/src/lib/documents/configLoader";

// import * as vscode from 'vscode';

// declare var _sltw_req_vscode: typeof import('vscode');

// self.global = self;

// function binder()
import ppts from "svelte-preprocess/dist/processors/typescript";

const conf = { preprocess: [ppts({ tsconfigFile: "/tsconfig.json", tsconfigDirectory:"/" })] };

configLoader.getConfig = (x) => conf;
configLoader.awaitConfig = () => Promise.resolve(conf);
configLoader.loadConfigs = () => Promise.resolve();

import { prettier } from "./prettier_fixed";

import { version as prettierVersion } from "prettier/package.json";
import { version as svelteVersion } from "svelte/package.json";
import { version as preprocess_version } from "svelte-preprocess/package.json";

// const vscode = require('vscode')
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
  "svelte-native/package.json": true,
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

//@ts-ignore
ts.sys = createSystem(fsMap);

let dir = "/";
_self.process = {
  cwd: () => dir,
  chdir: (x: string) => (dir = x),
  env: {},
};
export const dummy = 0;
