'use strict';
let runnerFrame, runnerReady, pendingRun=null;
let aiKey='', aiConfigured=false, aiBusy=false, lastAi=null;
const AI_PROVIDERS={
  openrouter:{name:'OpenRouter',model:'openrouter/free',link:'https://openrouter.ai/keys',note:'The free router selects free models. Availability and quotas vary. Other model IDs may require credits.'},
  groq:{name:'Groq',model:'openai/gpt-oss-20b',link:'https://console.groq.com/keys',note:'Free-plan limits depend on your account and model. Use a model enabled for your project.'},
  gemini:{name:'Gemini',model:'gemini-2.5-flash-lite',link:'https://aistudio.google.com/apikey',note:'Free-tier eligibility and quotas depend on your Google project. Google may use free-tier content to improve products.'},
  openai:{name:'OpenAI',model:'gpt-4.1-mini',link:'https://platform.openai.com/api-keys',note:'OpenAI API usage is generally billed separately from ChatGPT. Check pricing and account limits before using it.'}
};
let aiProvider='openrouter',aiModel=AI_PROVIDERS.openrouter.model;
const normalApi=api;
function difference(expected,actual){for(let i=0;i<Math.max(expected.length,actual.length);i++)if(expected[i]!==actual[i])return {index:i,line:expected.slice(0,i).split('\n').length,column:expected.slice(0,i).split('\n').pop().length+1,expected:expected[i]??'<end of output>',actual:actual[i]??'<end of output>'};return null;}
function setupRunner(){
  runnerReady=new Promise(resolve=>{
    runnerFrame=document.createElement('iframe');runnerFrame.title='Isolated browser Python';runnerFrame.hidden=true;runnerFrame.sandbox='allow-scripts';
    const startup=setTimeout(()=>resolve(false),15000);
    window.addEventListener('message',event=>{
      if(event.source!==runnerFrame.contentWindow||!event.data?.practiceRunner)return;
      const data=event.data;
      if(data.type==='ready'){clearTimeout(startup);resolve(true);}
      else if(pendingRun&&data.id===pendingRun.id){
        const pending=pendingRun;pendingRun=null;
        if(data.type==='error')pending.reject(new Error(data.error));
        else pending.resolve(data);
      }
    });
    runnerFrame.src=APP_BASE+'/sandbox.html';document.body.append(runnerFrame);
  });
}
async function browserRun(code,cases,rule){
  if(!(await runnerReady))throw new Error('The browser Python runner could not start. Reload and try again.');
  if(pendingRun)throw new Error('A program is already running.');
  $('run-status').textContent='Loading browser Python…';
  return new Promise((resolve,reject)=>{
    const id=crypto.randomUUID();pendingRun={id,resolve,reject};
    runnerFrame.contentWindow.postMessage({type:'execute',id,payload:{code,cases,rule}},'*');
  });
}
// Preserve the editor's existing API contract; code execution stays in the browser.
api=async function(path,data){
  if(path==='/api/run'){
    const result=await browserRun(data.code,[{input:data.input}],'');
    return result.results[0];
  }
  if(path==='/api/check'){
    const exercise=await normalApi('/api/tests?id='+encodeURIComponent(data.id));
    const result=await browserRun(data.code,exercise.tests,exercise.rule);
    if(result.restriction)return {passed:false,restriction:result.restriction,results:[],total:exercise.tests.length};
    const results=result.results.map((r,i)=>({...r,name:exercise.tests[i].name,input:exercise.tests[i].input,expected:exercise.tests[i].expected,passed:r.status==='ok'&&r.stdout===exercise.tests[i].expected,difference:difference(exercise.tests[i].expected,r.stdout)}));
    return {passed:results.length===exercise.tests.length&&results.every(r=>r.passed),total:exercise.tests.length,results};
  }
  if(path==='/api/health'){const health=await normalApi(path);aiConfigured=health.aiConfigured;refreshAiStatus();return {...health,python:'3.12 · WebAssembly'};}
  return normalApi(path,data);
};
setupRunner();
