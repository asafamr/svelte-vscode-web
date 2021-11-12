// manaully merged lanague tools server.ts + https://github.com/microsoft/vscode-extension-samples/blob/main/lsp-web-extension-sample/server/src/browserServerMain.ts

import "./shim_globals";
import { configLoader } from "../../vendored/langauge-tools/packages/language-server/src/lib/documents/configLoader";
import {
  createConnection,
  BrowserMessageReader,
  BrowserMessageWriter,
  ServerCapabilities,
  ApplyWorkspaceEditParams,
  ApplyWorkspaceEditRequest,
  CodeActionKind,
  DocumentUri,
  Connection,
  MessageType,
  RenameFile,
  RequestType,
  ShowMessageNotification,
  TextDocumentSyncKind,
  WorkspaceEdit,
  SemanticTokensRequest,
  SemanticTokensRangeRequest,
  DidChangeWatchedFilesParams,
  LinkedEditingRangeRequest,
  TextDocumentIdentifier,
} from "vscode-languageserver/browser";

import * as uniroll from "uniroll";
import * as path from "path";

console.debug("Svelte Web server starting...");

declare var self: any;

const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

const connection = createConnection(messageReader, messageWriter);

startServer({ connection });

import { DiagnosticsManager } from "../../vendored/langauge-tools/packages/language-server/src/lib/DiagnosticsManager";
import { Document, DocumentManager } from "../../vendored/langauge-tools/packages/language-server/src/lib/documents";
import { getSemanticTokenLegends } from "../../vendored/langauge-tools/packages/language-server/src/lib/semanticToken/semanticTokenLegend";
import { Logger } from "../../vendored/langauge-tools/packages/language-server/src/logger";
import { LSConfigManager } from "../../vendored/langauge-tools/packages/language-server/src/ls-config";
import {
  AppCompletionItem,
  CSSPlugin,
  HTMLPlugin,
  PluginHost,
  SveltePlugin,
  TypeScriptPlugin,
  OnWatchFileChangesPara,
  LSAndTSDocResolver,
} from "../../vendored/langauge-tools/packages/language-server/src/plugins";
import {
  debounceThrottle,
  normalizeUri,
  urlToPath,
} from "../../vendored/langauge-tools/packages/language-server/src/utils";

// import { FallbackWatcher } from "../../vendored/langauge-tools/packages/language-server/src/lib/FallbackWatcher";
import { setIsTrusted } from "../../vendored/langauge-tools/packages/language-server/src/importPackage";
import ts = require("typescript");
import { DocumentSnapshot } from "../../vendored/langauge-tools/packages/language-server/src/plugins/typescript/DocumentSnapshot";
import { knownLibFilesForCompilerOptions } from "../../vendored/tsvfs";
import { URI } from "vscode-uri";
import { Uri } from "vscode";

export interface LSOptions {
  /**
   * If you have a connection already that the ls should use, pass it in.
   * Else the connection will be created from `process`.
   */
  connection?: Connection;
  /**
   * If you want only errors getting logged.
   * Defaults to false.
   */
  logErrorsOnly?: boolean;
}

/**
 * Starts the language server.
 *
 * @param options Options to customize behavior
 */
function startServer(options?: LSOptions) {
  let connection = options?.connection as Connection;
  // if (!connection) {
  //     if (process.argv.includes('--stdio')) {
  //         console.log = (...args: any[]) => {
  //             console.warn(...args);
  //         };
  //         connection = createConnection(process.stdin, process.stdout);
  //     } else {
  //         connection = createConnection(
  //             new IPCMessageReader(process),
  //             new IPCMessageWriter(process)
  //         );
  //     }
  // }

  if (options?.logErrorsOnly !== undefined) {
    Logger.setLogErrorsOnly(options.logErrorsOnly);
  }

  const docManager = new DocumentManager((textDocument: any) => new Document(textDocument.uri, textDocument.text));
  const configManager = new LSConfigManager();
  const pluginHost = new PluginHost(docManager);
  let lsts: LSAndTSDocResolver;
  let sveltePlugin: SveltePlugin = undefined as any;
  // let watcher: FallbackWatcher | undefined;

  connection.onInitialize((evt) => {
    const workspaceUris = evt.workspaceFolders?.map((folder) => folder.uri.toString()) ?? [evt.rootUri ?? ""];
    Logger.log("Initialize language server at ", workspaceUris.join(", "));
    if (workspaceUris.length === 0) {
      Logger.error("No workspace path set");
    } else {
      process.chdir(urlToPath(workspaceUris[0]) ?? "/");
    }

    // if (!evt.capabilities.workspace?.didChangeWatchedFiles) {
    //   const workspacePaths = workspaceUris.map(urlToPath).filter(isNotNullOrUndefined);
    //   watcher = new FallbackWatcher("**/*.{ts,js}", workspacePaths);
    //   watcher.onDidChangeWatchedFiles(onDidChangeWatchedFiles);
    // }

    const isTrusted: boolean = evt.initializationOptions?.isTrusted ?? true;
    configLoader.setDisabled(!isTrusted);
    setIsTrusted(isTrusted);
    configManager.updateIsTrusted(isTrusted);
    if (!isTrusted) {
      Logger.log("Workspace is not trusted, running with reduced capabilities.");
    }

    // Backwards-compatible way of setting initialization options (first `||` is the old style)
    configManager.update(
      evt.initializationOptions?.configuration?.svelte?.plugin || evt.initializationOptions?.config || {}
    );
    configManager.updateTsJsUserPreferences(
      evt.initializationOptions?.configuration || evt.initializationOptions?.typescriptConfig || {}
    );
    configManager.updateEmmetConfig(
      evt.initializationOptions?.configuration?.emmet || evt.initializationOptions?.emmetConfig || {}
    );
    configManager.updatePrettierConfig(
      evt.initializationOptions?.configuration?.prettier || evt.initializationOptions?.prettierConfig || {}
    );

    const tsconftxt = ts.readConfigFile('-',(_)=>evt.initializationOptions?.filesys['/tsconfig.json']).config
    const parsedConfig = ts.parseJsonConfigFileContent(tsconftxt,ts.sys,'/')
    const tslibs = knownLibFilesForCompilerOptions(parsedConfig.options,ts)
    for (const [filename, content] of Object.entries(evt.initializationOptions?.filesys || {})) {
      if(filename.match(/lib\..*\.d\.ts$/)){
        if(tslibs.includes(filename.replace(/^\//,''))){
          ts.sys.writeFile(filename, content as string);
        }
      }
      else{
        ts.sys.writeFile(filename, content as string);
      }
    }

    pluginHost.initialize({
      filterIncompleteCompletions: !evt.initializationOptions?.dontFilterIncompleteCompletions,
      definitionLinkSupport: !!evt.capabilities.textDocument?.definition?.linkSupport,
    });
    pluginHost.register((sveltePlugin = new SveltePlugin(configManager)));
    pluginHost.register(new HTMLPlugin(docManager, configManager));
    pluginHost.register(new CSSPlugin(docManager, configManager));
    lsts = new LSAndTSDocResolver(
      docManager,
      workspaceUris.map(normalizeUri),
      configManager,
      notifyTsServiceExceedSizeLimit,
      false,
      "/tsconfig.json"
    );
    pluginHost.register(new TypeScriptPlugin(configManager, lsts));
    const clientSupportApplyEditCommand = !!evt.capabilities.workspace?.applyEdit;

    const capabilities: ServerCapabilities = {
      textDocumentSync: {
        openClose: true,
        change: TextDocumentSyncKind.Incremental,
        save: {
          includeText: false,
        },
      },
      hoverProvider: true,
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: [
          ".",
          '"',
          "'",
          "`",
          "/",
          "@",
          "<",

          // Emmet
          ">",
          "*",
          "#",
          "$",
          "+",
          "^",
          "(",
          "[",
          "@",
          "-",
          // No whitespace because
          // it makes for weird/too many completions
          // of other completion providers

          // Svelte
          ":",
          "|",
        ],
      },
      documentFormattingProvider: true,
      colorProvider: true,
      documentSymbolProvider: true,
      definitionProvider: true,
      codeActionProvider: evt.capabilities.textDocument?.codeAction?.codeActionLiteralSupport
        ? {
            codeActionKinds: [
              CodeActionKind.QuickFix,
              CodeActionKind.SourceOrganizeImports,
              ...(clientSupportApplyEditCommand ? [CodeActionKind.Refactor] : []),
            ],
          }
        : true,
      executeCommandProvider: clientSupportApplyEditCommand
        ? {
            commands: [
              "function_scope_0",
              "function_scope_1",
              "function_scope_2",
              "function_scope_3",
              "constant_scope_0",
              "constant_scope_1",
              "constant_scope_2",
              "constant_scope_3",
              "extract_to_svelte_component",
              "Infer function return type",
            ],
          }
        : undefined,
      renameProvider: evt.capabilities.textDocument?.rename?.prepareSupport ? { prepareProvider: true } : true,
      referencesProvider: true,
      selectionRangeProvider: true,
      signatureHelpProvider: {
        triggerCharacters: ["(", ",", "<"],
        retriggerCharacters: [")"],
      },
      semanticTokensProvider: {
        legend: getSemanticTokenLegends(),
        range: true,
        full: true,
      },
      linkedEditingRangeProvider: true,
    };
    return {
      capabilities
    };
  });

  function notifyTsServiceExceedSizeLimit() {
    connection?.sendNotification(ShowMessageNotification.type, {
      message:
        "Svelte language server detected a large amount of JS/Svelte files. " +
        "To enable project-wide JavaScript/TypeScript language features for Svelte files," +
        "exclude large folders in the tsconfig.json or jsconfig.json with source files that you do not work on.",
      type: MessageType.Warning,
    });
  }

  // connection.onExit(() => {
  //   watcher?.dispose();
  // });

  connection.onRenameRequest((req) => pluginHost.rename(req.textDocument, req.position, req.newName));
  connection.onPrepareRename((req) => pluginHost.prepareRename(req.textDocument, req.position));

  connection.onDidChangeConfiguration(({ settings }) => {
    configManager.update(settings.svelte?.plugin);
    configManager.updateTsJsUserPreferences(settings);
    configManager.updateEmmetConfig(settings.emmet);
    configManager.updatePrettierConfig(settings.prettier);
  });

  connection.onDidOpenTextDocument((evt) => {
    docManager.openDocument(evt.textDocument);
    docManager.markAsOpenedInClient(evt.textDocument.uri);
  });

  connection.onDidCloseTextDocument((evt) => docManager.closeDocument(evt.textDocument.uri));
  connection.onDidChangeTextDocument((evt) => {
    docManager.updateDocument(evt.textDocument, evt.contentChanges);
    pluginHost.didUpdateDocument();
  });
  connection.onHover((evt) => pluginHost.doHover(evt.textDocument, evt.position));
  connection.onCompletion((evt, cancellationToken) =>
    pluginHost.getCompletions(evt.textDocument, evt.position, evt.context, cancellationToken)
  );
  connection.onDocumentFormatting((evt) => {
    return pluginHost.formatDocument(evt.textDocument, evt.options);
  });
  connection.onRequest(new RequestType("html/tag"), (evt: any) =>
    pluginHost.doTagComplete(evt.textDocument, evt.position)
  );
  connection.onDocumentColor((evt) => pluginHost.getDocumentColors(evt.textDocument));
  connection.onColorPresentation((evt) => pluginHost.getColorPresentations(evt.textDocument, evt.range, evt.color));
  connection.onDocumentSymbol((evt, cancellationToken) =>
    pluginHost.getDocumentSymbols(evt.textDocument, cancellationToken)
  );
  connection.onDefinition((evt) => pluginHost.getDefinitions(evt.textDocument, evt.position));
  connection.onReferences((evt) => pluginHost.findReferences(evt.textDocument, evt.position, evt.context));

  connection.onCodeAction((evt, cancellationToken) =>
    pluginHost.getCodeActions(evt.textDocument, evt.range, evt.context, cancellationToken)
  );
  connection.onExecuteCommand(async (evt) => {
    const result = await pluginHost.executeCommand({ uri: evt.arguments?.[0] }, evt.command, evt.arguments);
    if (WorkspaceEdit.is(result)) {
      const edit: ApplyWorkspaceEditParams = { edit: result };
      connection?.sendRequest(ApplyWorkspaceEditRequest.type.method, edit);
    } else if (result) {
      connection?.sendNotification(ShowMessageNotification.type.method, {
        message: result,
        type: MessageType.Error,
      });
    }
  });

  connection.onCompletionResolve((completionItem, cancellationToken) => {
    const data = (completionItem as AppCompletionItem).data as TextDocumentIdentifier;

    if (!data) {
      return completionItem;
    }

    return pluginHost.resolveCompletion(data, completionItem, cancellationToken);
  });

  connection.onSignatureHelp((evt, cancellationToken) =>
    pluginHost.getSignatureHelp(evt.textDocument, evt.position, evt.context, cancellationToken)
  );

  connection.onSelectionRanges((evt) => pluginHost.getSelectionRanges(evt.textDocument, evt.positions));

  const diagnosticsManager = new DiagnosticsManager(
    connection.sendDiagnostics,
    docManager,
    pluginHost.getDiagnostics.bind(pluginHost)
  );

  const updateAllDiagnostics = debounceThrottle(() => diagnosticsManager.updateAll(), 1000);

  connection.onDidChangeWatchedFiles(onDidChangeWatchedFiles);
  function onDidChangeWatchedFiles(para: DidChangeWatchedFilesParams) {
    const onWatchFileChangesParas = para.changes
      .map((change) => ({
        fileName: urlToPath(change.uri),
        changeType: change.type,
      }))
      .filter((change): change is OnWatchFileChangesPara => !!change.fileName);
    pluginHost.onWatchFileChanges(onWatchFileChangesParas);
    updateAllDiagnostics();
  }

  connection.onDidSaveTextDocument(updateAllDiagnostics);
  connection.onNotification("$/onDidChangeTsOrJsFile", async (e: any) => {
    const path = urlToPath(e.uri);
    if (path && e?.changes?.length) {

      //this should keep ts/js files in sync with outside
      const current = DocumentSnapshot.fromNonSvelteFilePath(path)
      current.update(e.changes)
      ts.sys.writeFile(path, current.getText(0, 1e10))
      
      pluginHost.updateTsOrJsFile(path, e.changes);
    }
    updateAllDiagnostics();
  });

  connection.onRequest(SemanticTokensRequest.type, (evt, cancellationToken) =>
    pluginHost.getSemanticTokens(evt.textDocument, undefined, cancellationToken)
  );
  connection.onRequest(SemanticTokensRangeRequest.type, (evt, cancellationToken) =>
    pluginHost.getSemanticTokens(evt.textDocument, evt.range, cancellationToken)
  );

  connection.onRequest(
    LinkedEditingRangeRequest.type,
    async (evt) => await pluginHost.getLinkedEditingRanges(evt.textDocument, evt.position)
  );

  docManager.on(
    "documentChange",
    debounceThrottle(async (document: Document) => diagnosticsManager.update(document), 750)
  );
  docManager.on("documentClose", (document: Document) => diagnosticsManager.removeDiagnostics(document));

  // The language server protocol does not have a specific "did rename/move files" event,
  // so we create our own in the extension client and handle it here
  connection.onRequest("$/getEditsForFileRename", async (fileRename: RenameFile) =>
    pluginHost.updateImports(fileRename)
  );

  connection.onRequest("$/getCompiledCode", async (uri: DocumentUri) => {
    const doc = docManager.get(uri);
    if (!doc) return null;

    if (doc) {
      const compiled = await sveltePlugin.getCompiledResult(doc);
      if (compiled) {
        const js = compiled.js;
        const css = compiled.css;
        return { js, css };
      } else {
        return null;
      }
    }
  });

  connection.onRequest("$/getBundle", async (uri: string) => {
    const rootDoc = docManager.get(uri);
    if (!rootDoc) return null;

    async function getCompiled(uri:string):Promise<string|null>{
      const doc = docManager.get(uri);
      if(!doc) return null;
      const compiled = await sveltePlugin.getCompiledResult(doc);
      return compiled?.js;
    }
    const pluginPrefix='SFC:'
    const prx = (s:string)=>pluginPrefix+s;
    const unprx = (s:string)=>s.slice(pluginPrefix.length);

    const bundled = await uniroll.bundle({input: uri, files:{} ,extraPlugins:[{
      name:'svelte-fetch-compiled',
      async resolveId(source, importer){
        if(source.startsWith('http')|| importer?.startsWith('http')){
          return null;
        }
        if(docManager.get(source)){
          return prx(source);
        }
        if(importer?.startsWith(pluginPrefix) && (source.startsWith('.') || source.startsWith('/'))){
          const impPath = URI.parse(unprx(importer)).fsPath;
          const joined = path.join(path.dirname(impPath),source);
          return prx(joined)
        }
        return null;
      },
      async load(id):Promise<string | null>{
        
        if(id.startsWith(pluginPrefix)){
          const clean = unprx(id)
          if (id.endsWith('.svelte'))return getCompiled(clean);
          const fsPath = URI.parse(clean).fsPath;
          for(const ext of ['.ts','.d.ts','js']){
            if(ts.sys.fileExists(fsPath+ext)){
              let content = ts.sys.readFile(fsPath+ext) as string;
              if(ext!=='.js'){
                content = ts.transpileModule(content,{}).outputText;
              }
              return content
            }
          }
          
        } 
        return null;
      }
    }]})
    const out = await bundled.generate({ format: "iife",name:"__Comp" });
    return out.output[0].code
  });

  connection.listen();
}
