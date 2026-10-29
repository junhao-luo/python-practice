import {test} from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/index.mjs';
async function request(path,query={}){
  let status,body;const headers={};
  const res={status(code){status=code;return this;},setHeader(k,v){headers[k]=v;},send(data){body=data;},json(data){body=Buffer.from(JSON.stringify(data));}};
  await handler({url:'/api?__path='+encodeURIComponent(path),method:'GET',headers:{host:'python-practice.test'},query:{__path:path,...query}},res);
  return {status,body:body.toString(),headers};
}
test('Vercel rewrite retains the practice path and query parameters',async()=>{
  assert.equal((await request('')).status,200);
  assert.match((await request('app.js')).body,/APP_BASE/);
  const solution=await request('api/solution',{id:'seconds_conversion'});
  assert.equal(solution.status,200);assert.match(JSON.parse(solution.body).code,/3600/);
  assert.equal(JSON.parse((await request('api/health')).body).aiConfigured,false);
});
