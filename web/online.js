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
function refreshAiStatus(){
  const config=AI_PROVIDERS[aiProvider];
  $('ai-connection-status').textContent=aiKey?`${config.name} connected · this session only`:aiConfigured&&aiProvider==='gemini'?'Gemini connected by site owner':`Connect your ${config.name} API key`;
  $('ai-key-link').href=config.link;$('ai-key-link').textContent=`Get a ${config.name} API key`;
  $('ai-provider-note').textContent=config.note;
}
function showSettings(){refreshAiStatus();$('ai-settings').showModal();}
function currentSnapshot(){return {id:current.id,code:$('editor').value};}
function addAiText(parent,tag,text,className=''){const item=element(tag,className,text);parent.append(item);return item;}
function renderAi(result,snapshot){
  const panel=$('ai-results');panel.replaceChildren();
  $('ai-stale').hidden=$('editor').value===snapshot.code;
  const feedback=result.feedback;
  addAiText(panel,'div',result.grade?`Practice grade: ${result.grade.total} / 100`:'AI code review','ai-score');
  if(result.grade)addAiText(panel,'p',`Output ${result.grade.correctness}/60 · Approach ${result.grade.approach}/25 · Readability ${result.grade.readability}/15`,'ai-rubric');
  addAiText(panel,'p',feedback.summary);
  if(feedback.strengths.length){addAiText(panel,'h3','What works');feedback.strengths.forEach(text=>addAiText(panel,'p','✓ '+text,'ai-strength'));}
  if(feedback.issues.length){addAiText(panel,'h3','Suggested improvements');feedback.issues.forEach(issue=>{
    const card=element('div','ai-issue');addAiText(card,'strong',(issue.line?`Line ${issue.line}: `:'')+issue.problem);addAiText(card,'p',issue.suggestion);panel.append(card);
  });}
  if(feedback.suggested_code){
    const details=element('details');details.append(element('summary','','View suggested code'));addAiText(details,'pre',feedback.suggested_code);
    const apply=element('button','secondary','Use suggested code');apply.onclick=()=>{
      if(current.id!==snapshot.id||$('editor').value!==snapshot.code){toast('Your code changed after this review. Request a new review before applying edits.');return;}
      if(!confirm('Replace this draft with the AI suggestion? You will still need to check its output.'))return;
      $('editor').value=feedback.suggested_code;$('editor').dispatchEvent(new Event('input'));toast('Suggestion applied. Run Check answer to verify it.');
    };details.append(apply);panel.append(details);
  }
  addAiText(panel,'small',`AI feedback may be mistaken. Exact-output tests determine completion. Test evidence comes from this browser. ${AI_PROVIDERS[result.provider||'gemini'].name} · ${result.model}.`,'ai-disclaimer');
  lastAi={id:snapshot.id,code:snapshot.code};
}
async function aiReview(mode){
  if(busy||aiBusy){toast('Wait for the current run or review to finish.');return;}
  if(!aiKey&&!(aiConfigured&&aiProvider==='gemini')){showSettings();return;}
  if(!$('ai-consent').checked){showSettings();toast('Agree to send this exercise, code, and run results to the selected AI provider first.');return;}
  const snapshot=currentSnapshot();let evidence=null;
  const connection={provider:aiProvider,model:aiModel,...(aiKey?{apiKey:aiKey}:{})};
  aiBusy=true;$('ai-review').disabled=true;$('ai-grade').disabled=true;
  try{
    if(mode==='grade'){
      await execute('check');
      if(current.id!==snapshot.id||$('editor').value!==snapshot.code)throw new Error('Your code changed while checking. Request a new grade.');
      if(lastResult?.kind!=='check')throw new Error('The tests could not finish. Try Check answer first.');
      evidence=lastResult.data;
    }else if(lastResult?.kind==='check'&&lastResult.code===snapshot.code&&lastResult.id===snapshot.id)evidence=lastResult.data;
    const recentRun=lastResult?.kind==='run'&&lastResult.code===snapshot.code&&lastResult.id===snapshot.id?{...lastResult.data,input:lastResult.input}:null;
    if(evidence)evidence={...evidence,results:evidence.results.map(r=>({...r,stdout:r.stdout.slice(0,2000),stderr:r.stderr.slice(0,1500)}))};
    $('ai-results').replaceChildren(element('p','subtle',`${AI_PROVIDERS[connection.provider].name} is reviewing your code…`));
    const result=await normalApi('/api/ai',{...snapshot,...connection,mode,evidence,recentRun:recentRun?{...recentRun,stdout:recentRun.stdout.slice(0,2000),stderr:recentRun.stderr.slice(0,1500)}:null,consent:true});
    if(current.id!==snapshot.id){toast('Review completed for another exercise. Return and request a new review.');return;}
    renderAi(result,snapshot);
  }catch(error){$('ai-results').replaceChildren(element('p','error-text',error.message));}
  finally{aiBusy=false;$('ai-review').disabled=false;$('ai-grade').disabled=false;}
}
function setupAi(){
  $('ai-settings-open').onclick=showSettings;
  $('ai-settings-close').onclick=()=>$('ai-settings').close();
  $('ai-provider').onchange=()=>{aiProvider=$('ai-provider').value;aiModel=AI_PROVIDERS[aiProvider].model;$('ai-model').value=aiModel;aiKey='';$('ai-key').value='';$('ai-consent').checked=false;refreshAiStatus();};
  $('ai-connect').onclick=()=>{aiModel=$('ai-model').value.trim()||AI_PROVIDERS[aiProvider].model;aiKey=$('ai-key').value.trim();$('ai-key').value='';refreshAiStatus();$('ai-settings').close();toast(aiKey?`${AI_PROVIDERS[aiProvider].name} key connected for this tab session.`:'Using the site connection if available.');};
  $('ai-disconnect').onclick=()=>{aiKey='';$('ai-key').value='';refreshAiStatus();toast('Personal key removed from this session.');};
  $('ai-review').onclick=()=>aiReview('review');$('ai-grade').onclick=()=>aiReview('grade');
  $('exercise').addEventListener('change',()=>{$('ai-results').replaceChildren(element('p','subtle','Review your code or request a practice grade.'));lastAi=null;});
  $('editor').addEventListener('input',()=>{if(lastAi&&lastAi.code!==$('editor').value)$('ai-stale').hidden=false;});
  const oldChoose=choose;choose=function(id){oldChoose(id);if($('ai-results')){$('ai-results').replaceChildren(element('p','subtle','Review your code or request a practice grade.'));$('ai-stale').hidden=true;lastAi=null;}};
}
setupRunner();setupAi();init();
