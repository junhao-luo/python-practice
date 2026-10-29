import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker,{review,validateFeedback,evidenceFor} from '../dist/server/index.js';
const origin='https://practice.test';
const goodFeedback={summary:'Clear beginner solution.',strengths:['Uses integer arithmetic.'],issues:[],approach:25,readability:15,suggested_code:''};
const makeRequest=(data,extra={})=>new Request(origin+'/api/ai',{method:'POST',headers:{'Origin':origin,'X-Practice-Request':'1','Content-Type':'application/json','oai-authenticated-user-id':crypto.randomUUID(),...extra},body:JSON.stringify(data)});
const base={id:'seconds_conversion',code:'print(input())',mode:'review',consent:true};
test('fixed catalog and assets are available without server code execution',async()=>{
  const catalog=await(await worker.fetch(new Request(origin+'/api/problems'))).json();
  assert.equal(catalog.length,30);assert.equal('solution' in catalog[0],false);assert.equal('tests' in catalog[0],false);
  const page=await worker.fetch(new Request(origin+'/'));assert.equal(page.status,200);assert.match(await page.text(),/Grade with AI/);
  for(const path of ['/app.js','/online.js','/style.css','/ai.css','/sandbox.html'])assert.equal((await worker.fetch(new Request(origin+path))).status,200);
  assert.equal((await worker.fetch(new Request(origin+'/app.py'))).status,404);
  assert.equal((await worker.fetch(new Request(origin+'/api/run',{method:'POST'}))).status,405);
  const sandbox=await worker.fetch(new Request(origin+'/sandbox.html'));assert.match(sandbox.headers.get('Content-Security-Policy'),/connect-src https:\/\/cdn.jsdelivr.net/);
});
test('review requires same origin, explicit consent, a key, and bounded input',async()=>{
  assert.equal((await review(makeRequest(base,{Origin:'https://evil.test'}),{})).status,403);
  assert.equal((await review(makeRequest({...base,consent:false}),{})).status,400);
  assert.equal((await review(makeRequest(base),{})).status,503);
  assert.equal((await review(makeRequest({...base,code:'x'.repeat(20001)}),{})).status,400);
  assert.equal((await review(makeRequest({...base,apiKey:'bad\nheader'}),{})).status,400);
  const noIdentity=new Request(origin+'/api/ai',{method:'POST',headers:{Origin:origin,'X-Practice-Request':'1','Content-Type':'application/json'},body:JSON.stringify(base)});
  assert.equal((await review(noIdentity,{GEMINI_API_KEY:'test-only-fake-key'})).status,401);
});
test('AI receives canonical exercise, code and error evidence; keys stay in headers',async()=>{
  let sent;
  const fake=async(url,options)=>{sent={url,options};return Response.json({candidates:[{content:{parts:[{text:JSON.stringify(goodFeedback)}]}}]});};
  const result=await review(makeRequest({...base,apiKey:'test-only-personal-key',recentRun:{input:'0\n',stdout:'',stderr:'ZeroDivisionError',status:'error'}}),{},fake);
  assert.equal(result.status,200);const data=await result.json();assert.equal(data.feedback.approach,25);
  assert.equal(sent.options.headers['x-goog-api-key'],'test-only-personal-key');
  assert.equal(sent.options.body.includes('test-only-personal-key'),false);
  assert.match(sent.options.body,/UNTRUSTED DATA/);assert.match(sent.options.body,/ZeroDivisionError/);
  assert.equal(JSON.stringify(data).includes('test-only-personal-key'),false);
});
test('grade output points are computed from exact canonical outputs, ignoring client pass flags',async()=>{
  const {tests}=await(await worker.fetch(new Request(origin+'/api/tests?id=seconds_conversion'))).json();
  const evidence={results:tests.map(t=>({stdout:t.expected,status:'ok',passed:false,stderr:''}))};
  const fake=async()=>Response.json({candidates:[{content:{parts:[{text:JSON.stringify({...goodFeedback,approach:100,readability:100})}]}}]});
  let response=await review(makeRequest({...base,mode:'grade',evidence}),{GEMINI_API_KEY:'test-only-fake-key'},fake);
  assert.equal((await response.json()).grade.total,100);
  evidence.results[0].stdout=tests[0].expected.trimEnd();evidence.results[0].passed=true;
  response=await review(makeRequest({...base,mode:'grade',evidence}),{GEMINI_API_KEY:'test-only-fake-key'},fake);
  const grade=(await response.json()).grade;assert.equal(grade.correctness,48);assert.equal(grade.total,88);
  response=await review(makeRequest({...base,mode:'grade'}),{GEMINI_API_KEY:'test-only-fake-key'},fake);assert.equal(response.status,400);
});
test('quota, timeout and malformed model responses are actionable and do not expose provider bodies',async()=>{
  const env={GEMINI_API_KEY:'test-only-fake-key'};
  const quota=await review(makeRequest(base),env,async()=>new Response('sensitive provider body',{status:429}));
  assert.equal(quota.status,429);assert.match((await quota.json()).error,/quota/);
  const malformed=await review(makeRequest(base),env,async()=>Response.json({candidates:[{content:{parts:[{text:'not JSON'}]}}]}));assert.equal(malformed.status,502);
  const timeout=await review(makeRequest(base),env,async()=>{throw new DOMException('details','TimeoutError');});assert.match((await timeout.json()).error,/too long/);
  assert.throws(()=>validateFeedback({summary:'x',issues:[],approach:'25',readability:15}));
  const safe=validateFeedback({...goodFeedback,summary:'<script>alert(1)</script>'});assert.equal(safe.summary,'<script>alert(1)</script>'); // UI renders textContent, never HTML.
});
test('missing browser evidence cannot fabricate an output score',()=>{
  const problem={tests:[{input:'',expected:'x\n'}]};
  assert.equal(evidenceFor(problem,{results:[]}).passed,0);
  assert.equal(evidenceFor(problem,{restriction:'while only',results:[{stdout:'x\n',status:'ok'}]}).passed,0);
});
test('Groq, OpenRouter and OpenAI use fixed endpoints and the selected model',async()=>{
  for(const [provider,host,model] of [['groq','api.groq.com','openai/gpt-oss-20b'],['openrouter','openrouter.ai','openrouter/free'],['openai','api.openai.com','gpt-4.1-mini']]){
    let seen;
    const response=await review(makeRequest({...base,provider,model,apiKey:'test-only-personal-key'}),{},async(url,options)=>{
      seen={url,options};return Response.json({choices:[{message:{content:JSON.stringify(goodFeedback)}}]});
    });
    assert.equal(response.status,200);assert.equal(new URL(seen.url).hostname,host);
    assert.equal(seen.options.headers.Authorization,'Bearer test-only-personal-key');
    assert.equal(JSON.parse(seen.options.body).model,model);
    assert.equal((await response.json()).provider,provider);
  }
});
test('unknown providers and malicious model paths are rejected before an outbound call',async()=>{
  for(const input of [{provider:'https://evil.test'},{provider:'__proto__'},{provider:'groq',model:'evil?key=secret'}]){
    const response=await review(makeRequest({...base,...input,apiKey:'test-only-personal-key'}),{},()=>{throw new Error('Unexpected network call');});
    assert.equal(response.status,400);
  }
});
test('public deployment never uses an owner secret for anonymous requests',async()=>{
  const response=await review(makeRequest(base),{PUBLIC_APP:'1',GEMINI_API_KEY:'test-only-owner-key'});assert.equal(response.status,503);
});
test('the /python-practice prefix serves assets, catalog and solutions',async()=>{
  for(const path of ['/python-practice','/python-practice/','/python-practice/app.js','/python-practice/api/problems','/python-practice/api/solution?id=seconds_conversion'])assert.equal((await worker.fetch(new Request(origin+path))).status,200);
});
