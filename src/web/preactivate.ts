// import { Buffer } from "buffer";
import { LanguageClient, ServerOptions, TransportKind } from 'vscode-languageclient/node'
declare var require: any;
// self.Buffer = Buffer;

const originalRuntimeRequire = require;

require = function(req: string){
    if(req === 'vscode') return originalRuntimeRequire('vscode')
    if(req === 'vscode') return originalRuntimeRequire('vscode')
    else{
        console.error('required missing', req)
    }
}
require.resolve = (x: any) => x;






export const dummy = 0;
