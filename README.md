# Svelte VSCode Web Extension

This is an unoffical port of the svelte vscode extension to vscode web extension format.
Web extensions can run in vscode web mode (github.dev, github1s.com...) [but have some limitations](https://code.visualstudio.com/api/extension-guides/web-extensions).


I've started from the web extension starter template but switched to esbuild.

The official language tools repo is vendored but currently unmodified.

typescript support is preconfigured


<br/>
<br/>
<br/>

bootstrap with 

```bash
npm install
npm run bootstrap
```

start esbuild watch with `npm run dev-watch`

then either:

run in vscode with `F5` (debug with electorn dev tools - ctrl+shift+I) or

run in browser with `npm run run-in-browser` (debug with browser dev tools)


compile minified with `npm run compile` - this also writes some bundle size info to txt files


LICENSE: MIT