import {createClerkClient} from '@clerk/backend';
import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {PROGRESS_RULES} from '../dist/server/index.js';

const rules=new Map(PROGRESS_RULES.map(p=>[p.id,p.hintCount]));
const providerNames=['gemini','groq','openrouter','openai'];
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
function progressFrom(metadata={}){
  const data=metadata.pythonPractice||{},completed=[],hints={};
  for(const [id,count] of rules){if(data.completed?.[id]===true)completed.push(id);let revealed=0;for(let i=1;i<=count;i++)if(data.hints?.[id]?.[i]===true)revealed=i;if(revealed)hints[id]=revealed;}
  return {version:1,completed,hints,selected:rules.has(data.selected)?data.selected:PROGRESS_RULES[0].id};
}
function progressPatch(p){
  if(!p||!Array.isArray(p.completed)||p.completed.length>rules.size||!p.completed.every(id=>rules.has(id))||!p.hints||typeof p.hints!=='object'||Array.isArray(p.hints)||Object.keys(p.hints).length>rules.size||!rules.has(p.selected))throw Error('Invalid progress');
  const hints={};for(const [id,count] of Object.entries(p.hints)){if(!rules.has(id)||!Number.isInteger(count)||count<0||count>rules.get(id))throw Error('Invalid hints');if(count)hints[id]=Object.fromEntries(Array.from({length:count},(_,i)=>[String(i+1),true]));}
  return {version:1,completed:Object.fromEntries(p.completed.map(id=>[id,true])),hints,selected:p.selected};
}
function vaultKey(env){const key=Buffer.from(env.AI_KEY_ENCRYPTION_KEY||'','base64');if(key.length!==32)throw Error('Vault unavailable');return key;}
function openVault(metadata,userId,env){
  const box=metadata.pythonPracticeConnections?.encrypted;if(!box)return {};
  const bytes=Buffer.from(box,'base64');if(bytes.length<29)throw Error('Invalid vault');
  const decipher=createDecipheriv('aes-256-gcm',vaultKey(env),bytes.subarray(0,12));decipher.setAAD(Buffer.from(userId));decipher.setAuthTag(bytes.subarray(12,28));
  return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8'));
}
function sealVault(value,userId,env){
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',vaultKey(env),iv);cipher.setAAD(Buffer.from(userId));
  const ciphertext=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),ciphertext]).toString('base64');
}
function publicSettings(vault,metadata){return {selectedProvider:providerNames.includes(metadata.pythonPracticeConnections?.selectedProvider)?metadata.pythonPracticeConnections.selectedProvider:'openrouter',connections:Object.fromEntries(providerNames.filter(p=>vault[p]?.key).map(p=>[p,{hasKey:true,model:vault[p].model}]))};}
export async function authenticate(request,env){
  if(!env.CLERK_SECRET_KEY||!env.CLERK_PUBLISHABLE_KEY)return {error:reply({error:'Account storage is not configured yet.'},503)};
  if(!request.headers.get('Authorization')?.startsWith('Bearer ')&&!/(?:^|;\s*)__session=/.test(request.headers.get('Cookie')||''))return {error:reply({error:'Sign in to open Python Practice Lab.'},401)};
  const origins=['https://eljhon.me','https://www.eljhon.me','https://python-practice-chi.vercel.app'];
  if(env.NODE_ENV!=='production')origins.push('http://127.0.0.1:8766','http://localhost:8766');
  if(request.method!=='GET'&&(!origins.includes(request.headers.get('Origin'))||request.headers.get('X-Practice-Request')!=='1'))return {error:reply({error:'Open Practice Lab to change account settings.'},403)};
  const clerk=createClerkClient({publishableKey:env.CLERK_PUBLISHABLE_KEY.trim(),secretKey:env.CLERK_SECRET_KEY.trim()});
  try{const state=await clerk.authenticateRequest(request,{authorizedParties:origins,acceptsToken:'session_token'});const identity=state.toAuth();if(!identity?.userId||!identity?.sessionId){console.warn('Practice authentication rejected:',state.reason||'no-session');return {error:reply({error:'Sign in again to use account storage.'},401)};}return {clerk,userId:identity.userId};}catch(error){console.warn('Practice authentication failed:',error.name);return {error:reply({error:'Sign in again to use account storage.'},401)};}
}
export async function accountRoute(request,env){
  const path=new URL(request.url).pathname.replace(/^\/python-practice(?=\/|$)/,'');
  if(!['/api/account-progress','/api/account-settings'].includes(path))return null;
  if(!['GET','POST'].includes(request.method))return reply({error:'Method not allowed.'},405);
  const auth=await authenticate(request,env);if(auth.error)return auth.error;
  try{
    if(request.method==='GET'){
      const user=await auth.clerk.users.getUser(auth.userId);
      return path==='/api/account-progress'?reply({progress:progressFrom(user.privateMetadata)}):reply({settings:publicSettings(openVault(user.privateMetadata,auth.userId,env),user.privateMetadata)});
    }
    if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply({error:'JSON required.'},415);
    const raw=await request.text();if(raw.length>12000)return reply({error:'Account update is too large.'},413);
    let body;try{body=JSON.parse(raw);}catch{return reply({error:'Invalid account update.'},400);}
    if(path==='/api/account-progress'){
      let patch;try{patch=progressPatch(body.progress);}catch{return reply({error:'Invalid exercise progress.'},400);}
      const user=await auth.clerk.users.updateUserMetadata(auth.userId,{privateMetadata:{pythonPractice:patch}});
      return reply({progress:progressFrom(user.privateMetadata)});
    }
    if(!providerNames.includes(body.provider)||!['save','remove'].includes(body.action))return reply({error:'Choose a supported provider and action.'},400);
    const user=await auth.clerk.users.getUser(auth.userId),vault=openVault(user.privateMetadata,auth.userId,env);
    if(body.action==='remove')delete vault[body.provider];
    else{
      const key=typeof body.key==='string'?body.key.trim():vault[body.provider]?.key;
      if(!key||key.length>512||/[\r\n]/.test(key)||typeof body.model!=='string'||body.model.length>160||!/^[a-zA-Z0-9._:/-]+$/.test(body.model))return reply({error:'Enter a valid provider key and model.'},400);
      vault[body.provider]={key,model:body.model};
    }
    const selected=body.action==='save'?body.provider:providerNames.find(p=>vault[p]?.key)||'openrouter';
    const saved=await auth.clerk.users.updateUserMetadata(auth.userId,{privateMetadata:{pythonPracticeConnections:{version:1,encrypted:sealVault(vault,auth.userId,env),selectedProvider:selected}}});
    return reply({settings:publicSettings(vault,saved.privateMetadata)});
  }catch{return reply({error:'Account storage is temporarily unavailable. Your local work is retained; please retry.'},503);}
}
export async function savedAiRequest(request,env,body){
  if(body.useSavedKey!==true)return {request};
  const auth=await authenticate(request,env);if(auth.error)return {error:auth.error};
  try{
    if(!providerNames.includes(body.provider))return {error:reply({error:'Unknown provider.'},400)};
    const user=await auth.clerk.users.getUser(auth.userId),connection=openVault(user.privateMetadata,auth.userId,env)[body.provider];
    if(!connection?.key)return {error:reply({error:'Save a key for this provider in account settings first.'},400)};
    const headers=new Headers(request.headers);headers.delete('Content-Length');headers.set('oai-authenticated-user-id',auth.userId);
    return {request:new Request(request.url,{method:'POST',headers,body:JSON.stringify({...body,apiKey:connection.key,model:body.model||connection.model})})};
  }catch{return {error:reply({error:'The saved AI connection could not be opened. Check account settings or try a session key.'},503)};}
}
