//@ts-ignore
import ts from "typescript";
import { createSystem } from "@typescript/vfs";
// import { configLoader } from "../../vendored/langauge-tools/packages/language-server/src/lib/documents/configLoader";

declare var require: any;
// self.Buffer = Buffer;

// import * as vscode from 'vscode';

declare var self: any;
// declare var _sltw_req_vscode: typeof import('vscode');

// self.global = self;

// function binder()

import { version as prettierVersion } from "prettier/package.json";
import { version as svelteVersion } from "svelte/package.json";

const required = {
  "prettier/package.json": { version: prettierVersion },
  "svelte/package.json": { version: svelteVersion },
  "svelte/compiler":require("svelte/compiler")
  // 'svelte/package.json':{version: svelteVersion},
};
const thorwing = {
  "./node_modules/@microsoft/typescript-etw": true,
};

self.require = function (req: string) {
  if (thorwing.hasOwnProperty(req)) throw Error("");
  for (const imp of Object.keys(required)) {
    if (req.endsWith(imp)) return (required as any)[imp];
  }
  // else {
  console.error("dynamic required missing", req);
  // }
};
self.require.resolve = (x: any) => x;

const fsMap = new Map<string, string>();
//@ts-ignore
ts.sys = createSystem(fsMap);

self.errorOnFunction = function (...args: any[]) {
  console.error("Trying to create a Function", args);
};

let dir = "/";
self.process = {
  cwd: () => dir,
  chdir: (x: string) => (dir = x),
  env: {},
};
export const dummy = 0;
