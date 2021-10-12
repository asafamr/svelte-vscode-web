//https://github.com/microsoft/vscode-extension-samples/blob/main/lsp-web-extension-sample/client/src/browserClientMain.ts

import { ExtensionContext, Uri, workspace} from 'vscode';

import { LanguageClient } from 'vscode-languageclient/browser';

import {
    ExecuteCommandRequest,
    LanguageClientOptions,
    RequestType,
    RevealOutputChannelOn,
    TextDocumentEdit,
    TextDocumentPositionParams,
    WorkspaceEdit as LSWorkspaceEdit
} from 'vscode-languageclient';
import { configLoader } from "../../vendored/langauge-tools/packages/language-server/src/lib/documents/configLoader";

// configLoader.setDisabled(true);

// this method is called when vs code is activated
export function activate(context: ExtensionContext) {

	console.log('svelte client activation');

	/* 
	 * all except the code to create the language client in not browser specific
	 * and couuld be shared with a regular (Node) extension
	 */
	const documentSelector = [{ language: 'plaintext' }];

	const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'svelte' }],
        revealOutputChannelOn: RevealOutputChannelOn.Never,
        synchronize: {
            configurationSection: ['svelte', 'javascript', 'typescript', 'prettier'],
            fileEvents: workspace.createFileSystemWatcher('{**/*.js,**/*.ts}', false, false, false)
        },
        initializationOptions: JSON.stringify({
            configuration: {
                svelte: workspace.getConfiguration('svelte'),
                prettier: workspace.getConfiguration('prettier'),
                emmet: workspace.getConfiguration('emmet'),
                typescript: workspace.getConfiguration('typescript'),
                javascript: workspace.getConfiguration('javascript')
            },
            dontFilterIncompleteCompletions: true, // VSCode filters client side and is smarter at it than us
            isTrusted: (workspace as any).isTrusted
        })
    };


	// Options to control the language client
	// const clientOptions: LanguageClientOptions = {
	// 	documentSelector,
	// 	synchronize: {

	// 	},
	// 	initializationOptions: {}
	// };

	const client = createWorkerLanguageClient(context, clientOptions);

	const disposable = client.start();
	context.subscriptions.push(disposable);

	client.onReady().then(() => {
		console.log('svelte-web-ext server is ready');
	});
}

function createWorkerLanguageClient(context: ExtensionContext, clientOptions: LanguageClientOptions) {
	// Create a worker. The worker main file implements the language server.
	const serverMain = Uri.joinPath(context.extensionUri, 'dist/web/server.js');
	const worker = new Worker(serverMain.toString());

	// create the language server client to communicate with the server running in the worker
	return new LanguageClient('svelte-web-ext', 'Svelte Web Extension', clientOptions, worker);
}

// TODO: support all extension.js listerners etc...