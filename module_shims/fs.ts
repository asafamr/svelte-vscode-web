import type {readFileSync as _readFileSync, existsSync as _existsSync, writeFileSync as _writeFileSync, readFile as _readFile} from "fs"
import {Buffer as _Buffer} from "buffer"

import { SourceMapConsumer } from 'source-map/source-map';
// import {workspace,Uri} from "vscode"

let packagemock = 'typescriptServerPlugins-disabled'

export const readFileSync:typeof _readFileSync = (path, options)=>{
    console.log('reading ',path)
    if(path === "aaa")
    return _Buffer.from(packagemock) as any

}

export const writeFileSync:typeof _writeFileSync = (path, options)=>{
    console.log('writing ',path)

    if(path === "aaa")
    return _Buffer.from(packagemock) as any
    
}

export const readFile: typeof _readFile = (path, cb)=>{
    cb('unimplemented', null)
    // workspace.fs.readFile(Uri.file(path)).then(
    //     content=>cb(null,_Buffer.from(content)),
    //     err=>cb(err,null),
    // )
}   

readFile.__promisify__ = undefined as any



SourceMapConsumer.initialize({
    "lib/mappings.wasm": "https://unpkg.com/source-map@0.7.3/lib/mappings.wasm"
});

export const existsSync: typeof _existsSync =(...args)=>{
    return false
}
export default {}