//https://github.com/microsoft/vscode-extension-samples/blob/main/lsp-web-extension-sample/client/src/browserClientMain.ts

import { ExtensionContext, Uri } from 'vscode';
import { LanguageClientOptions } from 'vscode-languageclient';

import { LanguageClient } from 'vscode-languageclient/browser';

// this method is called when vs code is activated
export function activate(context: ExtensionContext) {

	console.log('lsp-web-extension-sample activated!');

	/* 
	 * all except the code to create the language client in not browser specific
	 * and couuld be shared with a regular (Node) extension
	 */
	const documentSelector = [{ language: 'plaintext' }];

	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		documentSelector,
		synchronize: {},
		initializationOptions: {}
	};

	const client = createWorkerLanguageClient(context, clientOptions);

	const disposable = client.start();
	context.subscriptions.push(disposable);

	client.onReady().then(() => {
		console.log('svelte-web-ext server is ready');
	});
}

function createWorkerLanguageClient(context: ExtensionContext, clientOptions: LanguageClientOptions) {
	// Create a worker. The worker main file implements the language server.
	const serverMain = Uri.joinPath(context.extensionUri, 'dist/server.js');
	const worker = new Worker(serverMain.toString());

	// create the language server client to communicate with the server running in the worker
	return new LanguageClient('svelte-web-ext', 'Svelte Web Extension', clientOptions, worker);
}

// TODO: support all extension.js listerners etc...