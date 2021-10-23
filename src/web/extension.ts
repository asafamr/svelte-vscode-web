//https://github.com/microsoft/vscode-extension-samples/blob/main/lsp-web-extension-sample/client/src/browserClientMain.ts

import { LanguageClient } from "vscode-languageclient/browser";

import {
  ExecuteCommandRequest,
  LanguageClientOptions,
  RequestType,
  RevealOutputChannelOn,
  TextDocumentEdit,
  // TextDocumentPositionParams,
  WorkspaceEdit as LSWorkspaceEdit,
} from "vscode-languageclient";

import {
  commands,
  Disposable,
  ExtensionContext,
  FileType,
  // extensions,
  IndentAction,
  languages,
  Position,
  ProgressLocation,
  Range,
  TextDocument,
  Uri,
  ViewColumn,
  window,
  workspace,
  WorkspaceEdit,
} from "vscode";

import { activateTagClosing } from "../../vendored/langauge-tools/packages/svelte-vscode/src/html/autoClose";
import { EMPTY_ELEMENTS } from "../../vendored/langauge-tools/packages/svelte-vscode/src/html/htmlEmptyTagsShared";
import CompiledCodeContentProvider from "../../vendored/langauge-tools/packages/svelte-vscode/src/CompiledCodeContentProvider";

Buffer = require("buffer").Buffer;

let disposables: Disposable[] = [];

function dispose() {
  for (const d of disposables) {
    d.dispose();
  }
  disposables = [];
}

// this method is called when vs code is activated
export async function activate(context: ExtensionContext) {
  context.subscriptions.push({ dispose });
  console.log("svelte client activation");

  /*
   * all except the code to create the language client in not browser specific
   * and couuld be shared with a regular (Node) extension
   */
  const documentSelector = [{ language: "plaintext" }];

  workspace.onDidSaveTextDocument(async (doc) => {
    const parts = doc.uri.toString(true).split(/\/|\\/);
    if (
      [
        "tsconfig.json",
        // 'jsconfig.json',
        // 'svelte.config.js',
        // 'svelte.config.cjs',
        // 'svelte.config.mjs'
      ].includes(parts[parts.length - 1])
    ) {
      await restartLS(false);
    }
  });

  // Options to control the language client
  // const clientOptions: LanguageClientOptions = {
  // 	documentSelector,
  // 	synchronize: {

  // 	},
  // 	initializationOptions: {}
  // };

  let ls = createWorkerLanguageClient(context, await getClientOptions(context));

  const disposable = ls.start();

  disposables.push(disposable);

  ls.onReady().then(() => {
    console.log("svelte-web-ext server is ready");

    const tagRequestor = (document: TextDocument, position: Position) => {
      const param = ls.code2ProtocolConverter.asTextDocumentPositionParams(document, position);
      return ls.sendRequest(new RequestType("html/tag"), param) as any;
    };
    const disposable = activateTagClosing(tagRequestor, { svelte: true }, "html.autoClosingTags");
    disposables.push(disposable);
  });

  disposables.push(
    commands.registerCommand("svelte.restartLanguageServer", async () => {
      await restartLS(true);
    })
  );

  let restartingLs = false;
  let lsDisposable: Disposable;
  async function restartLS(showNotification: boolean) {
    if (restartingLs) {
      return;
    }

    restartingLs = true;
    await ls.stop();
    getClientOptions;
    dispose();
    ls = createWorkerLanguageClient(context, await getClientOptions(context));
    lsDisposable = ls.start();
    disposables.push(lsDisposable);
    await ls.onReady();
    if (showNotification) {
      window.showInformationMessage("Svelte language server restarted.");
    }
    restartingLs = false;
  }

  function getLS() {
    return ls;
  }

  addDidChangeTextDocumentListener(getLS);

  addRenameFileListener(getLS);

  addCompilePreviewCommand(getLS, context);

  addExtracComponentCommand(getLS, context);

  languages.setLanguageConfiguration("svelte", {
    indentationRules: {
      // Matches a valid opening tag that is:
      //  - Not a doctype
      //  - Not a void element
      //  - Not a closing tag
      //  - Not followed by a closing tag of the same element
      // Or matches `<!--`
      // Or matches open curly brace
      //
      increaseIndentPattern:
        // eslint-disable-next-line max-len, no-useless-escape
        /<(?!\?|(?:area|base|br|col|frame|hr|html|img|input|link|meta|param)\b|[^>]*\/>)([-_\.A-Za-z0-9]+)(?=\s|>)\b[^>]*>(?!.*<\/\1>)|<!--(?!.*-->)|\{[^}"']*$/,
      // Matches a closing tag that:
      //  - Follows optional whitespace
      //  - Is not `</html>`
      // Or matches `-->`
      // Or closing curly brace
      //
      // eslint-disable-next-line no-useless-escape
      decreaseIndentPattern: /^\s*(<\/(?!html)[-_\.A-Za-z0-9]+\b[^>]*>|-->|\})/,
    },
    // Matches a number or word that either:
    //  - Is a number with an optional negative sign and optional full number
    //    with numbers following the decimal point. e.g `-1.1px`, `.5`, `-.42rem`, etc
    //  - Is a sequence of characters without spaces and not containing
    //    any of the following: `~!@$^&*()=+[{]}\|;:'",.<>/
    //
    wordPattern:
      // eslint-disable-next-line max-len, no-useless-escape
      /(-?\d*\.\d\w*)|([^\`\~\!\@\$\#\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\s]+)/g,
    onEnterRules: [
      {
        // Matches an opening tag that:
        //  - Isn't an empty element
        //  - Is possibly namespaced
        //  - Isn't a void element
        //  - Isn't followed by another tag on the same line
        //
        // eslint-disable-next-line no-useless-escape
        beforeText: new RegExp(`<(?!(?:${EMPTY_ELEMENTS.join("|")}))([_:\\w][_:\\w-.\\d]*)([^/>]*(?!/)>)[^<]*$`, "i"),
        // Matches a closing tag that:
        //  - Is possibly namespaced
        //  - Possibly has excess whitespace following tagname
        afterText: /^<\/([_:\w][_:\w-.\d]*)\s*>/i,
        action: { indentAction: IndentAction.IndentOutdent },
      },
      {
        // Matches an opening tag that:
        //  - Isn't an empty element
        //  - Isn't namespaced
        //  - Isn't a void element
        //  - Isn't followed by another tag on the same line
        //
        // eslint-disable-next-line no-useless-escape
        beforeText: new RegExp(`<(?!(?:${EMPTY_ELEMENTS.join("|")}))(\\w[\\w\\d]*)([^/>]*(?!/)>)[^<]*$`, "i"),
        action: { indentAction: IndentAction.Indent },
      },
    ],
  });
}

// from https://github.com/microsoft/TypeScript-Website/blob/v2/packages/typescript-vfs/src/index.ts
const knownLibFilesForCompilerOptions = (target?: string, lib?: string[]) => {
  target = target ? target.toLowerCase() : "es5";
  lib = lib ? lib.map((x) => x.toLowerCase()) : [];
  // const target = compilerOptions.target || ts.ScriptTarget.ES5
  // const lib = compilerOptions.lib || []

  const files = [
    "lib.d.ts",
    "lib.dom.d.ts",
    "lib.dom.iterable.d.ts",
    "lib.webworker.d.ts",
    "lib.webworker.importscripts.d.ts",
    "lib.scripthost.d.ts",
    "lib.es5.d.ts",
    "lib.es6.d.ts",
    "lib.es2015.collection.d.ts",
    "lib.es2015.core.d.ts",
    "lib.es2015.d.ts",
    "lib.es2015.generator.d.ts",
    "lib.es2015.iterable.d.ts",
    "lib.es2015.promise.d.ts",
    "lib.es2015.proxy.d.ts",
    "lib.es2015.reflect.d.ts",
    "lib.es2015.symbol.d.ts",
    "lib.es2015.symbol.wellknown.d.ts",
    "lib.es2016.array.include.d.ts",
    "lib.es2016.d.ts",
    "lib.es2016.full.d.ts",
    "lib.es2017.d.ts",
    "lib.es2017.full.d.ts",
    "lib.es2017.intl.d.ts",
    "lib.es2017.object.d.ts",
    "lib.es2017.sharedmemory.d.ts",
    "lib.es2017.string.d.ts",
    "lib.es2017.typedarrays.d.ts",
    "lib.es2018.asyncgenerator.d.ts",
    "lib.es2018.asynciterable.d.ts",
    "lib.es2018.d.ts",
    "lib.es2018.full.d.ts",
    "lib.es2018.intl.d.ts",
    "lib.es2018.promise.d.ts",
    "lib.es2018.regexp.d.ts",
    "lib.es2019.array.d.ts",
    "lib.es2019.d.ts",
    "lib.es2019.full.d.ts",
    "lib.es2019.object.d.ts",
    "lib.es2019.string.d.ts",
    "lib.es2019.symbol.d.ts",
    "lib.es2020.d.ts",
    "lib.es2020.full.d.ts",
    "lib.es2020.string.d.ts",
    "lib.es2020.symbol.wellknown.d.ts",
    "lib.es2020.bigint.d.ts",
    "lib.es2020.promise.d.ts",
    "lib.es2020.sharedmemory.d.ts",
    "lib.es2020.intl.d.ts",
    "lib.es2021.d.ts",
    "lib.es2021.full.d.ts",
    "lib.es2021.promise.d.ts",
    "lib.es2021.string.d.ts",
    "lib.es2021.weakref.d.ts",
    "lib.esnext.d.ts",
    "lib.esnext.full.d.ts",
    "lib.esnext.intl.d.ts",
    "lib.esnext.promise.d.ts",
    "lib.esnext.string.d.ts",
    "lib.esnext.weakref.d.ts",
  ];

  // const targetToCut = ts.ScriptTarget[target]
  const matches = files.filter((f) => f.startsWith(`lib.${target}`));
  const targetCutIndex = files.indexOf(matches.pop()!);

  const getMax = (array: number[]) =>
    array && array.length ? array.reduce((max, current) => (current > max ? current : max)) : undefined;

  // Find the index for everything in
  const indexesForCutting = lib.map((lib) => {
    const matches = files.filter((f) => f.startsWith(`lib.${lib.toLowerCase()}`));
    if (matches.length === 0) return 0;

    const cutIndex = files.indexOf(matches.pop()!);
    return cutIndex;
  });

  const libCutIndex = getMax(indexesForCutting) || 0;

  const finalCutIndex = Math.max(targetCutIndex, libCutIndex);
  return files.slice(0, finalCutIndex + 1);
};

async function getClientOptions(context: ExtensionContext): Promise<LanguageClientOptions> {
  const filesys = await readDirToDict(workspace.workspaceFolders?.map(x=>x.uri)??[], [".svelte", ".ts", ".js", "tsconfig.json"])
  let tsconfigContent = JSON.stringify({
    compilerOptions: {
      lib: ["DOM", "ES2015"],
      module: "ES6",
      target: "ES6",
      rootDir: "./",
    },
  });
  if(workspace.workspaceFolders?.length){
    const tspath= Uri.joinPath(workspace.workspaceFolders[0].uri,'tsconfig.json')
    if(filesys[tspath.fsPath]){
      tsconfigContent = filesys[tspath.fsPath];
    }
    
  }
  let target = "es5";
  let lib = [];
  try {
    const parsed = JSON.parse(tsconfigContent);
    target = parsed?.compilerOptions?.target;
    lib = parsed?.compilerOptions?.lib;
  } catch (err) {
    console.info("Could not get target and libs from tsconfig");
  }
  filesys['/tsconfig.json'] = tsconfigContent;
  filesys['/node_modules/svelte/index.d.ts'] = 'export * from "/node_modules/svelte/types/runtime/index.d.ts"'
  for(const [k,v] of Object.entries(await readDirToDict([Uri.joinPath(context.extensionUri, "dist", "libs")],['.d.ts']))){
    const toRep = Uri.joinPath(context.extensionUri, "dist", "libs").fsPath;
    if(k.includes('svelte/')){
      filesys[k.replace(toRep+'/svelte','/node_modules/svelte/types')] = v;
    }else{
      filesys[k.replace(toRep,'')] = v;
    }
  }
  return {
    documentSelector: [{ scheme: "file", language: "svelte" }],
    revealOutputChannelOn: RevealOutputChannelOn.Never,
    synchronize: {
      configurationSection: ["svelte", "javascript", "typescript", "prettier"],
      fileEvents: workspace.createFileSystemWatcher("{**/*.js,**/*.ts,**/*.svelte}", false, false, false),
    },
    initializationOptions: 
      {
        configuration: JSON.parse(JSON.stringify({
          svelte: workspace.getConfiguration("svelte"),
          prettier: workspace.getConfiguration("prettier"),
          emmet: workspace.getConfiguration("emmet"),
          typescript: workspace.getConfiguration("typescript"),
          javascript: workspace.getConfiguration("javascript"),
        })),
        filesys,
        dontFilterIncompleteCompletions: true, // VSCode filters client side and is smarter at it than us
        isTrusted: (workspace as any).isTrusted,
      }
  };
}

function createWorkerLanguageClient(context: ExtensionContext, clientOptions: LanguageClientOptions) {
  // Create a worker. The worker main file implements the language server.
  const serverMain = Uri.joinPath(context.extensionUri, "dist/web/server.js");

  const worker = new Worker(serverMain.toString());

  return new LanguageClient("svelte-web-ext", "Svelte Web Extension", clientOptions, worker);
}

function addDidChangeTextDocumentListener(getLS: () => LanguageClient) {
  // Only Svelte file changes are automatically notified through the inbuilt LSP
  // because the extension says it's only responsible for Svelte files.
  // Therefore we need to set this up for TS/JS files manually.
  workspace.onDidChangeTextDocument((evt) => {
    if (evt.document.languageId === "typescript" || evt.document.languageId === "javascript") {
      getLS().sendNotification("$/onDidChangeTsOrJsFile", {
        uri: evt.document.uri.toString(true),
        changes: evt.contentChanges.map((c) => ({
          range: {
            start: { line: c.range.start.line, character: c.range.start.character },
            end: { line: c.range.end.line, character: c.range.end.character },
          },
          text: c.text,
        })),
      });
    }
  });
}

function addRenameFileListener(getLS: () => LanguageClient) {
  workspace.onDidRenameFiles(async (evt) => {
    const oldUri = evt.files[0].oldUri.toString(true);
    const parts = oldUri.split(/\/|\\/);
    const lastPart = parts[parts.length - 1];
    // If user moves/renames a folder, the URI only contains the parts up to that folder,
    // and not files. So in case the URI does not contain a '.', check for imports to update.
    if (lastPart.includes(".") && ![".ts", ".js", ".json", ".svelte"].some((ending) => lastPart.endsWith(ending))) {
      return;
    }

    window.withProgress({ location: ProgressLocation.Window, title: "Updating Imports.." }, async () => {
      const editsForFileRename = await getLS().sendRequest<LSWorkspaceEdit | null>(
        "$/getEditsForFileRename",
        // Right now files is always an array with a single entry.
        // The signature was only designed that way to - maybe, in the future -
        // have the possibility to change that. If that ever does, update this.
        // In the meantime, just assume it's a single entry and simplify the
        // rest of the logic that way.
        {
          oldUri,
          newUri: evt.files[0].newUri.toString(true),
        }
      );
      if (!editsForFileRename) {
        return;
      }

      const workspaceEdit = new WorkspaceEdit();
      // Renaming a file should only result in edits of existing files
      editsForFileRename.documentChanges?.filter(TextDocumentEdit.is).forEach((change) =>
        change.edits.forEach((edit) => {
          workspaceEdit.replace(
            Uri.parse(change.textDocument.uri),
            new Range(
              new Position(edit.range.start.line, edit.range.start.character),
              new Position(edit.range.end.line, edit.range.end.character)
            ),
            edit.newText
          );
        })
      );
      workspace.applyEdit(workspaceEdit);
    });
  });
}

function addCompilePreviewCommand(getLS: () => LanguageClient, context: ExtensionContext) {
  const compiledCodeContentProvider = new CompiledCodeContentProvider(getLS as any);

  disposables.push(
    workspace.registerTextDocumentContentProvider(CompiledCodeContentProvider.scheme, compiledCodeContentProvider),
    compiledCodeContentProvider
  );

  disposables.push(
    commands.registerTextEditorCommand("svelte.showCompiledCodeToSide", async (editor) => {
      if (editor?.document?.languageId !== "svelte") {
        return;
      }

      const uri = editor.document.uri;
      const svelteUri = CompiledCodeContentProvider.toSvelteSchemeUri(uri);
      window.withProgress({ location: ProgressLocation.Window, title: "Compiling.." }, async () => {
        return await window.showTextDocument(svelteUri, {
          preview: true,
          viewColumn: ViewColumn.Beside,
        });
      });
    })
  );
}

function addExtracComponentCommand(getLS: () => LanguageClient, context: ExtensionContext) {
  disposables.push(
    commands.registerTextEditorCommand("svelte.extractComponent", async (editor) => {
      if (editor?.document?.languageId !== "svelte") {
        return;
      }

      // Prompt for new component name
      const options = {
        prompt: "Component Name: ",
        placeHolder: "NewComponent",
      };

      window.showInputBox(options).then(async (filePath) => {
        if (!filePath) {
          return window.showErrorMessage("No component name");
        }

        const uri = editor.document.uri.toString();
        const range = editor.selection;
        getLS().sendRequest(ExecuteCommandRequest.type, {
          command: "extract_to_svelte_component",
          arguments: [uri, { uri, range, filePath }],
        });
      });
    })
  );
}

async function readDirToDict(paths: Uri[], extensions: string[]) {
  const thatsTooMuchMan = {};
  const res: Record<string, string> = {};
  let nFiles = 0;
  let size = 0;

  async function walk(dir: Uri, onFound: (path: Uri) => Promise<void>) {
    try {
      const nodes = (await workspace.fs.readDirectory(dir)).sort();
      const files = nodes.flatMap((x) => (x[1] === FileType.File ? [Uri.joinPath(dir, x[0])] : []));
      const dirs = nodes.flatMap((x) => (x[1] === FileType.Directory ? [Uri.joinPath(dir, x[0])] : []));
      for (const f of files) {
        if (extensions.find((x) => f.fsPath.endsWith(x))) {
          await onFound(f);
        }
      }
      for (const d of dirs) {
        if (d.fsPath.includes("node_modules")) continue;
        await walk(d, onFound);
      }
    } catch (error) {
      if (error === thatsTooMuchMan) throw error;
      console.warn("error while getting initial fs", error);
    }
  }
  for(const pathUri of paths){
    await walk(pathUri, async (foundPath) => {
      if (nFiles > 1000 || size > 10e6) { 
        throw thatsTooMuchMan;
      }
      const content = await workspace.fs.readFile(foundPath).then((x) => new TextDecoder().decode(x));
      res[foundPath.fsPath] = content;
      size += content.length;
      nFiles += 1;
    }).catch(e=>{
      if(e === thatsTooMuchMan)return res;
    });
  }
  return res;
}
