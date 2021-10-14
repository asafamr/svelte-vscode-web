const _self = self as any;
_self._Function = function (...args: any[]) {
  if ("" + args === "return this")
    return function () {
      //@ts-ignore
      return this;
    };
  if ("" + args === "modulePath,return import(modulePath)") return (x: any) => x;
  console.error("Trying to create a Function", args);
};

_self._importScripts = function (...args: any[]) {
  console.error("Trying to import a script", args);
};

import { Buffer } from "buffer";
_self._Buffer = Buffer;
