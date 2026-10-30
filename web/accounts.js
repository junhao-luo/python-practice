'use strict';
let accountUser=null, accountGeneration=0, cloudSnapshot='', applyingAccount=false, sendingProgress=false, progressTimer, accountReady=false;
let userButtonMounted=false;
const localSave=save;
save=function(){
  localSave();
  if(accountReady&&accountUser&&!applyingAccount)queueProgress();
};
function accountStatus(text,error=false){$('account-sync').textContent=text;$('account-sync').classList.toggle('sync-error',error);}
function accountProgress(){
  const completed=[],hints={};
  for(const p of allProblems){const d=state.drafts[p.id];if(!d)continue;if(d.completed===true||d.passedCode===d.code)completed.push(p.id);if(d.hints>0)hints[p.id]=Math.min(p.hints.length,d.hints);}
  return {version:1,completed,hints,selected:current?.id||problems[0].id};
}
function mergeAccountProgress(remote){
  const completed=new Set(remote.completed||[]);
  for(const p of allProblems){
    if(completed.has(p.id))draft(p).completed=true;
    const revealed=remote.hints?.[p.id];if(Number.isInteger(revealed))draft(p).hints=Math.max(draft(p).hints||0,Math.min(p.hints.length,revealed));
  }
}
function cloudState(remote){
  const completed=allProblems.filter(p=>remote.completed.includes(p.id)).map(p=>p.id),hints={};
  for(const p of allProblems)if(remote.hints?.[p.id]>0)hints[p.id]=remote.hints[p.id];
  return {version:1,completed,hints,selected:remote.selected};
}
async function accountRequest(method,progress){
  return (await accountFetch('/api/account-progress',method,method==='POST'?{progress}:undefined)).progress;
}
async function accountFetch(path,method='GET',body){
  const user=window.Clerk?.user,session=window.Clerk?.session;if(!user||!session||user.id!==accountUser)throw Error('Sign in again to use account storage.');
  const token=await session.getToken();if(!token)throw Error('Sign in again to use account storage.');
  const response=await fetch(APP_BASE+path,{method,headers:{Authorization:'Bearer '+token,...(method==='POST'?{'Content-Type':'application/json','X-Practice-Request':'1'}:{})},...(method==='POST'?{body:JSON.stringify(body)}:{})});
  let result;try{result=await response.json();}catch{throw Error('Account storage could not connect. Your local work is retained.');}
  if(!response.ok)throw Error(result.error||'Account storage is unavailable.');return result;
}
function queueProgress(){
  if(!accountUser||!accountReady||applyingAccount)return;
  if(JSON.stringify(accountProgress())===cloudSnapshot)return;
  clearTimeout(progressTimer);accountStatus('Saving to account…');progressTimer=setTimeout(pushProgress,1500);
}
async function pushProgress(){
  if(!accountUser||!accountReady||sendingProgress===accountGeneration||applyingAccount)return;
  const generation=accountGeneration,progressToSend=accountProgress();
  if(JSON.stringify(progressToSend)===cloudSnapshot){accountStatus('Progress saved to account');return;}
  sendingProgress=generation;
  try{
    const remote=await accountRequest('POST',progressToSend);
    if(generation!==accountGeneration)return;
    applyingAccount=true;mergeAccountProgress(remote);localSave();progress();hints();applyingAccount=false;
    cloudSnapshot=JSON.stringify(cloudState(remote));
    accountStatus('Progress saved to account');
    if(JSON.stringify(accountProgress())!==cloudSnapshot)queueProgress();
  }catch(error){if(generation===accountGeneration)accountStatus('Not synced · retry',true);}
  finally{if(sendingProgress===generation)sendingProgress=false;}
}
function readLocalAccount(key){
  try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&saved.drafts&&typeof saved.drafts==='object')return saved;}catch{}
  return {selected:problems[0].id,drafts:{}};
}
function hasGuestWork(){
  const guest=readLocalAccount(GUEST_KEY);
  return Object.values(guest.drafts).some(d=>d.completed===true||d.hints>0||d.passedCode||typeof d.code==='string'&&!d.code.startsWith('# '));
}
async function changeAccount(user){
  const id=user?.id||null;if(id===accountUser){if(!accountReady&&!id){accountReady=true;accountStatus('Guest · progress on this device');}return;}
  clearTimeout(progressTimer);localSave();accountGeneration++;identityEpoch++;
  const generation=accountGeneration;
  accountReady=false;applyingAccount=true;accountUser=id;cloudSnapshot='';
  resetAssistantAccount();
  KEY=id?GUEST_KEY+':account:'+id:GUEST_KEY;state=readLocalAccount(KEY);choose(state.selected);
  $('account-sign-in').hidden=!!id;$('account-user').hidden=!id;$('account-import').hidden=!id||!hasGuestWork();
  if(userButtonMounted){window.Clerk.unmountUserButton($('account-user'));userButtonMounted=false;}
  if(id){window.Clerk.mountUserButton($('account-user'),{afterSignOutUrl:location.origin+(APP_BASE||'/python-practice')});userButtonMounted=true;}
  if(!id){accountStatus('Guest · progress on this device');applyingAccount=false;accountReady=true;return;}
  accountStatus('Loading account progress…');
  const initialSelection=state.selected;
  try{
    const [remote]=await Promise.all([accountRequest('GET'),loadSavedConnections(generation)]);if(generation!==accountGeneration)return;
    mergeAccountProgress(remote);
    if(state.selected===initialSelection&&allProblems.some(p=>p.id===remote.selected))choose(remote.selected);
    localSave();progress();hints();
    cloudSnapshot=JSON.stringify(cloudState(remote));accountStatus('Progress saved to account');
  }catch(error){if(generation===accountGeneration)accountStatus('Not synced · retry',true);}
  finally{if(generation===accountGeneration){applyingAccount=false;accountReady=true;queueProgress();}}
}
async function refreshAccount(){
  if(!accountUser||!accountReady||sendingProgress===accountGeneration)return;
  if(JSON.stringify(accountProgress())!==cloudSnapshot){pushProgress();return;}
  const generation=accountGeneration;
  try{const remote=await accountRequest('GET');if(generation!==accountGeneration)return;applyingAccount=true;mergeAccountProgress(remote);localSave();progress();hints();applyingAccount=false;cloudSnapshot=JSON.stringify(accountProgress());accountStatus('Progress saved to account');}catch{accountStatus('Not synced · retry',true);}
}
function importGuestWork(){
  if(!accountUser)return;
  const guest=readLocalAccount(GUEST_KEY);
  for(const p of allProblems){
    const incoming=guest.drafts[p.id];if(!incoming)continue;
    const existing=draft(p);
    if(typeof incoming.code==='string'&&existing.code===starter(p)){existing.code=incoming.code;existing.input=typeof incoming.input==='string'?incoming.input:p.sample.input;}
    existing.completed=existing.completed===true||incoming.completed===true||incoming.passedCode===incoming.code;
    existing.hints=Math.max(existing.hints||0,Math.min(p.hints.length,Number.isInteger(incoming.hints)?incoming.hints:0));
  }
  choose(current.id);$('account-import').hidden=true;save();queueProgress();toast('Guest work imported. Completion and hint progress sync to your account; drafts stay on this device.');
}
async function loadClerkScript(src,key){
  await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.async=true;script.crossOrigin='anonymous';if(key)script.dataset.clerkPublishableKey=key;script.onload=resolve;script.onerror=()=>reject(Error('Sign-in could not load.'));document.head.append(script);});
}
async function setupAccounts(){
  if(!problems.length)await new Promise(resolve=>window.addEventListener('practice-ready',resolve,{once:true}));
  $('account-import').onclick=importGuestWork;
  $('account-sync').onclick=()=>accountUser?refreshAccount():$('account-sign-in').click();
  try{
    const config=await normalApi('/api/auth-config');
    if(!config.enabled){accountStatus('Sign-in is being configured');$('account-sign-in').disabled=true;return;}
    const domain=atob(config.publishableKey.split('_')[2]).replace(/\$$/,'');
    if(!/^[a-z0-9.-]+$/.test(domain))throw Error('Invalid sign-in configuration.');
    await loadClerkScript(`https://${domain}/npm/@clerk/ui@1/dist/ui.browser.js`);
    await loadClerkScript(`https://${domain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`,config.publishableKey);
    await window.Clerk.load({ui:{ClerkUI:window.__internal_ClerkUICtor}});
    const returnUrl=location.origin+(APP_BASE||'/python-practice');
    $('account-sign-in').disabled=false;$('account-sign-in').onclick=()=>window.Clerk.openSignIn({forceRedirectUrl:returnUrl,signUpForceRedirectUrl:returnUrl});
    window.Clerk.addListener(({user})=>{if((user?.id||null)!==accountUser)changeAccount(user);});
    await changeAccount(window.Clerk.user);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshAccount();else if(accountUser)pushProgress();});
  }catch{accountStatus('Sign-in unavailable · reload',true);$('account-sign-in').disabled=true;}
}
init();setupAccounts();
