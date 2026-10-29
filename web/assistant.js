'use strict';
let savedConnections={},usingSavedConnection=false,tutorHistory=[];
function refreshAiStatus(){
  const config=AI_PROVIDERS[aiProvider],saved=savedConnections[aiProvider]?.hasKey;
  $('ai-connection-status').textContent=aiKey?`${config.name} connected for this tab`:usingSavedConnection&&saved?`${config.name} · encrypted connection saved to account`:`Connect your ${config.name} API key`;
  $('ai-key-link').href=config.link;$('ai-key-link').textContent=`Get ${config.name} API key`;
  $('ai-provider-note').textContent=config.note;
  const signedIn=!!window.Clerk?.user;
  $('ai-save-account').disabled=!signedIn;$('ai-remove-account').hidden=!signedIn||!saved;
  $('ai-account-note').textContent=signedIn?'Saved connections are encrypted on the server and available after sign-in on other devices.':'Sign in before saving an encrypted connection to your account.';
}
function showSettings(){refreshAiStatus();$('ai-settings').showModal();}
function connectionReady(){return !!aiKey||usingSavedConnection&&!!savedConnections[aiProvider]?.hasKey&&!!window.Clerk?.session;}
function aiConnection(){return {provider:aiProvider,model:aiModel,...(aiKey?{apiKey:aiKey}:{useSavedKey:true})};}
function snapshot(){return {id:current.id,code:$('editor').value,epoch:identityEpoch};}
function relevantEvidence(s){return lastResult?.kind==='check'&&lastResult.id===s.id&&lastResult.code===s.code?lastResult.data:null;}
function recentRun(s){return lastResult?.kind==='run'&&lastResult.id===s.id&&lastResult.code===s.code?{status:lastResult.data.status,input:lastResult.input,stdout:lastResult.data.stdout.slice(0,1000),stderr:lastResult.data.stderr.slice(-1600)}:null;}
function compactEvidence(evidence){return evidence?{restriction:evidence.restriction||'',results:evidence.results.map(r=>({status:r.status,stdout:r.stdout.slice(0,2000),stderr:r.stderr.slice(-1600)}))}:null;}
async function requestAssistant(data){
  if(data.useSavedKey)return accountFetch('/api/ai','POST',data);
  return normalApi('/api/ai',data);
}
function aiFooter(parent,result){
  const usage=result.cached?'Reused matching feedback · no new model request':result.usage?`Input ${result.usage.input} · output ${result.usage.output} tokens`:'Compact request';
  parent.append(element('small','ai-disclaimer',`${AI_PROVIDERS[result.provider].name} · ${result.model} · ${usage}. AI feedback can be mistaken; exact tests determine completion.`));
}
function setAiBusy(value){aiBusy=value;$('ai-review').disabled=value;$('tutor-send').disabled=value;$('check').disabled=value||busy;}
function renderGrade(result,s){
  const panel=$('grade-results');panel.replaceChildren();
  panel.append(element('div','ai-score',`Practice grade: ${result.grade.total} / 100`),element('p','ai-rubric',`Output ${result.grade.correctness}/60 · Approach ${result.grade.approach}/25 · Readability ${result.grade.readability}/15`),element('p','',result.feedback.summary));
  result.feedback.strengths.forEach(text=>panel.append(element('p','ai-strength','✓ '+text)));
  result.feedback.issues.forEach(issue=>{const card=element('div','ai-issue');card.append(element('strong','',(issue.line?`Line ${issue.line}: `:'')+issue.problem),element('p','',issue.suggestion));panel.append(card);});
  aiFooter(panel,result);lastAi={id:s.id,code:s.code};
}
async function automaticGrade(s,evidence){
  const panel=$('grade-results'),passed=evidence.results.filter(r=>r.passed).length;
  panel.replaceChildren(element('p','ai-rubric',`Exact-output points: ${Math.round(60*passed/current.test_count)} / 60`));
  if(!connectionReady()||!$('ai-consent').checked){panel.append(element('p','subtle','Connect an AI provider and allow sharing in account settings, then click Check answer for your AI grade and feedback.'));return;}
  setAiBusy(true);panel.append(element('p','subtle','Grading with AI…'));
  try{
    const result=await requestAssistant({...s,...aiConnection(),mode:'grade',evidence:compactEvidence(evidence),consent:true});
    if(identityEpoch!==s.epoch||current.id!==s.id)return;
    if($('editor').value!==s.code){panel.replaceChildren(element('p','subtle','Your draft changed. Click Check answer for an updated grade.'));return;}
    renderGrade(result,s);
  }catch(error){if(identityEpoch===s.epoch&&current.id===s.id){panel.replaceChildren(element('p','ai-rubric',`Exact-output points: ${Math.round(60*passed/current.test_count)} / 60`),element('p','error-text',error.message));}}
  finally{setAiBusy(false);}
}
function chatBubble(role,text){const bubble=element('div','tutor-message '+role);bubble.append(element('small','',role==='user'?'YOU':'AI TUTOR'),element('div','',text));$('ai-results').append(bubble);bubble.scrollIntoView({block:'nearest'});return bubble;}
async function tutor(mode){
  if(busy||aiBusy){toast('Wait for the current run or AI response to finish.');return;}
  if(!connectionReady()||!$('ai-consent').checked){showSettings();return;}
  const question=mode==='explain'?'Explain the current error or failed output and help me understand the next step.':$('tutor-input').value.trim();
  if(!question){$('tutor-input').focus();return;}
  const s=snapshot(),history=tutorHistory.slice(-4),evidence=relevantEvidence(s),run=recentRun(s);
  if(mode==='explain'&&!run&&!evidence){toast('Run your program or click Check answer first so the tutor can see the error.');return;}
  if(!$('ai-results').querySelector('.tutor-message'))$('ai-results').replaceChildren();
  chatBubble('user',question);tutorHistory.push({role:'user',text:question});$('tutor-input').value='';
  const waiting=chatBubble('assistant','Thinking…');setAiBusy(true);
  try{
    const result=await requestAssistant({...s,...aiConnection(),mode,question,history,evidence:compactEvidence(evidence),recentRun:run,consent:true});
    if(identityEpoch!==s.epoch||current.id!==s.id)return;
    waiting.remove();const reply=chatBubble('assistant',result.answer);aiFooter(reply,result);tutorHistory.push({role:'assistant',text:result.answer});tutorHistory=tutorHistory.slice(-8);
  }catch(error){if(identityEpoch===s.epoch&&current.id===s.id){waiting.remove();chatBubble('assistant',error.message);}}
  finally{setAiBusy(false);}
}
async function loadSavedConnections(generation){
  if(!window.Clerk?.user)return;
  try{const {settings}=await accountFetch('/api/account-settings');if(generation!==accountGeneration)return;savedConnections=settings.connections||{};aiProvider=Object.hasOwn(AI_PROVIDERS,settings.selectedProvider)?settings.selectedProvider:'openrouter';aiModel=savedConnections[aiProvider]?.model||AI_PROVIDERS[aiProvider].model;usingSavedConnection=!!savedConnections[aiProvider]?.hasKey;$('ai-provider').value=aiProvider;$('ai-model').value=aiModel;$('ai-save-account').checked=usingSavedConnection;refreshAiStatus();}catch{if(generation===accountGeneration)$('ai-account-note').textContent='Saved connections could not load. You can still use a key for this tab.';}
}
function resetAssistantAccount(){savedConnections={};usingSavedConnection=false;aiKey='';tutorHistory=[];lastAi=null;$('ai-key').value='';$('ai-consent').checked=false;$('ai-save-account').checked=false;resetAssistantPanels();refreshAiStatus();}
function resetAssistantPanels(){tutorHistory=[];lastAi=null;$('ai-stale').hidden=true;$('grade-results').replaceChildren(element('p','subtle','Click Check answer to run the tests and get an automatic AI grade.'));$('ai-results').replaceChildren(element('p','subtle','Ask a programming question or explain the latest error.'));}
function setupAssistant(){
  $('ai-settings-open').onclick=showSettings;$('ai-settings-close').onclick=()=>$('ai-settings').close();
  $('ai-provider').onchange=()=>{aiProvider=$('ai-provider').value;aiModel=savedConnections[aiProvider]?.model||AI_PROVIDERS[aiProvider].model;aiKey='';usingSavedConnection=!!savedConnections[aiProvider]?.hasKey&&!!window.Clerk?.user;$('ai-key').value='';$('ai-model').value=aiModel;$('ai-save-account').checked=usingSavedConnection;$('ai-consent').checked=false;refreshAiStatus();};
  $('ai-connect').onclick=async()=>{
    const generation=identityEpoch,entered=$('ai-key').value.trim(),model=$('ai-model').value.trim()||AI_PROVIDERS[aiProvider].model;
    $('ai-connect').disabled=true;
    try{
      if($('ai-save-account').checked){
        if(!window.Clerk?.user)throw Error('Sign in before saving an account connection.');
        const {settings}=await accountFetch('/api/account-settings','POST',{action:'save',provider:aiProvider,model,...(entered?{key:entered}:{})});
        if(generation!==identityEpoch)return;savedConnections=settings.connections;aiKey='';usingSavedConnection=true;
      }else if(entered){aiKey=entered;usingSavedConnection=false;}
      else usingSavedConnection=!!savedConnections[aiProvider]?.hasKey;
      aiModel=model;$('ai-key').value='';refreshAiStatus();$('ai-settings').close();toast(usingSavedConnection?'Encrypted account connection is ready.':'AI connection is ready for this tab.');
    }catch(error){toast(error.message);}finally{$('ai-connect').disabled=false;}
  };
  $('ai-remove-account').onclick=async()=>{
    if(!confirm('Remove this saved provider key from your account? This removes the app’s copy; it does not revoke the key at your provider.'))return;
    const epoch=identityEpoch,provider=aiProvider;
    try{const {settings}=await accountFetch('/api/account-settings','POST',{action:'remove',provider});if(epoch!==identityEpoch)return;savedConnections=settings.connections;if(provider===aiProvider){usingSavedConnection=false;aiKey='';$('ai-save-account').checked=false;}refreshAiStatus();toast('Saved account connection removed.');}catch(error){if(epoch===identityEpoch)toast(error.message);}
  };
  $('ai-disconnect').onclick=()=>{aiKey='';usingSavedConnection=false;$('ai-key').value='';refreshAiStatus();toast('Disconnected in this tab. The saved account copy is retained.');};
  $('ai-review').onclick=()=>tutor('explain');$('tutor-send').onclick=()=>tutor('tutor');$('tutor-input').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();tutor('tutor');}});
  $('editor').addEventListener('input',()=>{if(lastAi&&lastAi.code!==$('editor').value)$('ai-stale').hidden=false;});
  const originalChoose=choose;choose=function(id){originalChoose(id);resetAssistantPanels();};
  const originalExecute=execute;execute=async function(kind){
    if(busy)return;if(kind==='check'&&aiBusy){toast('Wait for the current AI response before checking again.');return;}
    const s=snapshot();await originalExecute(kind);
    if(kind==='check'&&identityEpoch===s.epoch&&current.id===s.id&&$('editor').value===s.code&&lastResult?.kind==='check'&&lastResult.code===s.code)await automaticGrade(s,lastResult.data);
  };
}
setupAssistant();
