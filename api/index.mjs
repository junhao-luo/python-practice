import worker from '../dist/server/index.js';
export default async function handler(req,res){
  try{
    const origin='https://'+(req.headers['x-forwarded-host']||req.headers.host);
    const url=new URL(req.url,origin);
    if(req.query?.__path!==undefined){
      const path=Array.isArray(req.query.__path)?req.query.__path.join('/'):String(req.query.__path);
      url.pathname='/python-practice/'+path;
      url.searchParams.delete('__path');
      for(const [name,value] of Object.entries(req.query))if(name!=='__path'&&typeof value==='string')url.searchParams.set(name,value);
    }
    const body=req.method==='GET'||req.method==='HEAD'?undefined:typeof req.body==='string'?req.body:JSON.stringify(req.body||{});
    if(body&&Buffer.byteLength(body)>90000){res.status(413).json({error:'Request too large.'});return;}
    const request=new Request(url,{method:req.method,headers:req.headers,...(body?{body}:{})});
    const response=await worker.fetch(request,{...process.env,PUBLIC_APP:'1'});
    res.status(response.status);response.headers.forEach((value,name)=>res.setHeader(name,value));
    res.send(Buffer.from(await response.arrayBuffer()));
  }catch{res.status(500).json({error:'The practice service could not finish this request. Please try again.'});}
}
