# Svelte VSCode Web Extension

This is an unoffical port of svelte vscode extension to vscode web.
Web extensions can run in both standalonde vscode and browser-based web vscode (used in e.g. github.dev, github1s.com, vscode.dev...).
[Web extensions have some limitations](https://code.visualstudio.com/api/extension-guides/web-extensions).

This is still a work in progress, feel free to create issues in the project repo. refernced below.



[REPO](https://github.com/asafamr/svelte-vscode-web) readme:

I've started from the web extension starter template but switched to esbuild.

The official language tools repo is vendored ~~but currently unmodified~~ and has some small changes marked with a `WEBEXT` comment

Typescript support is preconfigured

Marketplace extension url: https://marketplace.visualstudio.com/items?itemName=asafamr.svelte-web

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