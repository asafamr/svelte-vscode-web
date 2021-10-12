//@ts-ignore
import ts from "typescript";
import { createSystem } from "@typescript/vfs"
// import { configLoader } from "../../vendored/langauge-tools/packages/language-server/src/lib/documents/configLoader";



declare var require: any;
// self.Buffer = Buffer;

// import * as vscode from 'vscode';

declare var self: any;
// declare var _sltw_req_vscode: typeof import('vscode');

// self.global = self;

// function binder()

const required = {
  'prettier/package.json':require('prettier/package.json'),

}
const thorwing = {
  './node_modules/@microsoft/typescript-etw':true
}

self.require = function (req: string) {
  if(thorwing.hasOwnProperty(req)) throw Error('')
  if (required.hasOwnProperty(req)) return (required as any)[req] ;
  // else {
    console.error("dynamic required missing", req);
  // }
};
self.require.resolve = (x: any) => x;

const fsMap = new Map<string, string>()
//@ts-ignore
ts.sys =  createSystem(fsMap)

self.mockFunction = function(...args:any[]){
  console.error('dyanmic function', args)
}

let dir = '/';
self.process ={
  cwd:()=>dir,
  chdir:(x:string)=>dir=x,
  env: {} 
}

// configLoader.setDisabled(true);

export const dummy = 0;


