
const pathToFileURL =(surl:string) =>{
    return new URL(surl, 'file:')
}

exports = {
    URL,
    pathToFileURL
}