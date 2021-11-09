import { assert } from "chai";
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
// import * as myExtension from '../../extension';

async function waitSeconds(secs: number) {
  return new Promise((r) => setTimeout(r, secs * 1000));
}
suite("Web Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");
  
  
  let compAUri:vscode.Uri;
  let compBUri:vscode.Uri;
  let unformattedUri:vscode.Uri;

  

  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension("asafamr.svelte-web");
    assert.isOk(ext, "Could not activate extension!");
    await ext!.activate();

	const scheme = ext?.extensionUri.scheme === 'file' ? 'file':"vscode-test-web";
  	const pathPrefix = scheme==='file'? ext?.extensionUri.fsPath+'/test':'';

	compAUri = vscode.Uri.from({ scheme, path: pathPrefix+"/CompA.svelte" });
	compBUri = vscode.Uri.from({ scheme, path: pathPrefix+"/CompB.svelte" });
	unformattedUri = vscode.Uri.from({ scheme, path: pathPrefix+"/Unformatted.svelte" });

    await waitSeconds(3);
  });

    
  test("Symbols", async () => {
    const doc = await vscode.workspace.openTextDocument(compBUri);
    const symbols = (await vscode.commands.executeCommand("vscode.executeDocumentSymbolProvider", doc.uri)) as any[];
    assert.lengthOf(symbols, 2) //<script> X 2
  });

  test("Formatter", async () => {
    const doc = await vscode.workspace.openTextDocument(unformattedUri);
    const textEdits = (await vscode.commands.executeCommand("vscode.executeFormatDocumentProvider", doc.uri, { insertSpaces: true, tabSize: 2 })) as any[];
	const workEdits = new vscode.WorkspaceEdit();
	workEdits.set(doc.uri, textEdits);
	await vscode.workspace.applyEdit(workEdits);
	assert.equal(doc.getText(), '<script context="module" lang="ts">\n  export const moduleExport: string = "exp";\n</script>\n\n<script>\n  let myname = "B";\n  export let paramNum = 100;\n</script>\n\nthis is comp {myname}<!----->\nparam {paramNum}\n\n<style>\n  div {\n    color: var(--asd, blue); /* --- */\n  }\n</style>\n')
  });

  test('ColorProvider', async () => {
  	const doc = await vscode.workspace.openTextDocument(compAUri);
  	const colors = (await vscode.commands.executeCommand('vscode.executeDocumentColorProvider', doc.uri)) as any[];
  	assert.ok(colors)
  	assert.lengthOf(colors, 3)
  	const expected:any = [
  		{ red: 1, green: 0, blue: 0, alpha: 1 },
  		{
  			red: 0.9411764705882353,
  			green: 0.9725490196078431,
  			blue: 1,
  			alpha: 1
  		  },
  		  {
  			red: 0.4980392156862745,
  			green: 0.4980392156862745,
  			blue: 0.4980392156862745,
  			alpha: 1
  		  }
  	  ]

  	for(const i of [0,1,2]){
  		for(const prop in expected[i]){
  			assert.approximately(colors[i].color[prop], expected[i][prop],1e-4, `color #${i}[${prop}] not matching`)
  		}
  	}
  });
});
