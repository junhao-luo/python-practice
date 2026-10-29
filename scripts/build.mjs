import {readFile,writeFile,mkdir} from 'node:fs/promises';
const files={};
for(const name of ['index.html','style.css','ai.css','accounts.css','app.js','online.js','assistant.js','accounts.js','sandbox.html']) files['/'+(name==='index.html'?'':name)] = await readFile(new URL('../web/'+name,import.meta.url),'utf8');
const problems=JSON.parse(await readFile(new URL('../problems.json',import.meta.url),'utf8'));
const source=await readFile(new URL('../worker/index.js',import.meta.url),'utf8');
const ai=await readFile(new URL('../worker/ai.js',import.meta.url),'utf8');
const output=`const ASSETS=${JSON.stringify(files)};\nconst PROBLEMS=${JSON.stringify(problems)};\n`+ai+'\nexport {validateFeedback,evidenceFor,review,PROGRESS_RULES};\n'+source;
await mkdir(new URL('../dist/server/',import.meta.url),{recursive:true});
await writeFile(new URL('../dist/server/index.js',import.meta.url),output);
try{
  const manifest=await readFile(new URL('../.openai/hosting.json',import.meta.url));
  await mkdir(new URL('../dist/.openai/',import.meta.url),{recursive:true});
  await writeFile(new URL('../dist/.openai/hosting.json',import.meta.url),manifest);
}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(new URL('../public/',import.meta.url),{recursive:true});
await writeFile(new URL('../public/.keep',import.meta.url),'');
console.log('Built online app: 30 fixed exercises + browser Python + multi-provider AI.');
