
//@ts-ignore
import prettier from "prettier";

//@ts-ignore
prettier.resolveConfig = async (filePath: string, options?: prettier.ResolveConfigOptions | undefined) => null;
//@ts-ignore
prettier.resolveConfig.sync = (filePath: string, options?: prettier.ResolveConfigOptions | undefined) => null;
//@ts-ignore
prettier.getFileInfo = async (filePath: string, options?: prettier.FileInfoOptions | undefined) => (<prettier.FileInfoResult>{ ignored: false, inferredParser: 'svelte' })

prettier.getFileInfo.sync = (filePath: string, options?: prettier.FileInfoOptions | undefined) => (<prettier.FileInfoResult>{ ignored: false, inferredParser: 'svelte' })

//@ts-ignore
import prettier_plugin_svelte from "prettier-plugin-svelte";

// import { version as pps_version } from "prettier-plugin-svelte/package.json";
// required["/prettier-plugin-svelte"] = prettier_plugin_svelte;
// required["prettier-plugin-svelte/package.json"] = { version: pps_version };
// resolved_to_package["prettier-plugin-svelte"] = prettier_plugin_svelte;



import * as prettier_babel from "prettier/parser-babel";
import * as prettier_ts from "prettier/parser-typescript";
 
import * as prettier_css from "prettier/parser-postcss";
import * as prettier_html from "prettier/parser-html";

declare var prettierPlugins: any;

const _pformat = prettier.format;
prettier.format = (source: string, options?: import('prettier').Options) => _pformat(source, {
  ...(options || {}),
  plugins: [
    prettier_plugin_svelte,
    prettier_babel,
    prettier_css,
    prettier_ts,
    prettier_html
  ]
})

export  {prettier};