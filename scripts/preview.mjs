import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
const {default:worker}=await import(pathToFileURL(resolve('dist/server/index.js')).href);
const port=Number(process.env.PORT||8766);
const server=http.createServer(async(req,res)=>{
  try{
    if(req.url==='/selftest'){res.writeHead(200,{'Content-Type':'text/html'});res.end(await readFile('tests/browser-selftest.html'));return;}
    if(req.url==='/qa-catalog'){res.writeHead(200,{'Content-Type':'application/json'});res.end(await readFile('problems.json'));return;}
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>100000){res.writeHead(413);res.end();return;}chunks.push(chunk);}
    const body=Buffer.concat(chunks);
    const request=new Request(`http://127.0.0.1:${port}${req.url}`,{method:req.method,headers:req.headers,...(req.method==='GET'||req.method==='HEAD'?{}:{body})});
    const response=await worker.fetch(request,process.env,{});
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(500);res.end('Preview error.');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Practice Lab preview: http://127.0.0.1:${port}`));
