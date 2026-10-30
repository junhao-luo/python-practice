'use strict';
const $ = id => document.getElementById(id);
const APP_BASE = location.pathname.startsWith('/python-practice') ? '/python-practice' : '';
const GUEST_KEY = 'python-practice-lab-v1';
let KEY = GUEST_KEY, identityEpoch = 0;
let problems = [], allProblems = [], courses = [], activeCourse = 'programming', current, busy = false, lastResult = null, toastTimer;
let state = {selected: '', drafts: {}};
try { const saved = JSON.parse(localStorage.getItem(KEY)); if (saved && saved.drafts && typeof saved.drafts === 'object') state = saved; } catch {}
const starter = p => `# ${p.title}\n# ${p.kind==='plot'?'Create the requested chart with Matplotlib.':'Read the input, solve the problem, and print the exact output.'}\n\n`;
function draft(p = current) {
  if (!state.drafts[p.id]) state.drafts[p.id] = {code: starter(p), input: p.sample.input, hints: 0, passedCode: null};
  return state.drafts[p.id];
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); $('save-state').textContent = 'Saved locally'; }
  catch { $('save-state').textContent = 'Storage full — export progress'; }
}
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 4000); }
function solved(p) { const d = state.drafts[p.id]; return !!d && (d.completed===true || d.passedCode === d.code); }
function progress() {
  const count = problems.filter(solved).length;
  $('progress').max = problems.length;
  $('progress').value = count; $('progress-label').textContent = `${count} / ${problems.length} complete`;
  problems.forEach((p, i) => { const option = $('exercise').options[i]; option.textContent = `${solved(p) ? '✓ ' : ''}${String(i+1).padStart(2,'0')}  ${p.title}`; });
  $('completion').textContent = solved(current) ? '✓ COMPLETED' : 'IN PROGRESS';
  $('completion').classList.toggle('solved', solved(current));
}
function lineNumbers() {
  $('line-numbers').textContent = Array.from({length: $('editor').value.split('\n').length}, (_,i) => i+1).join('\n');
  $('line-numbers').scrollTop = $('editor').scrollTop;
  const before = $('editor').value.slice(0, $('editor').selectionStart);
  $('cursor').textContent = `Ln ${before.split('\n').length}, Col ${before.split('\n').pop().length + 1}`;
}
function displayText(value) {
  if (!value) return '[empty output]';
  return $('whitespace').checked ? value.replace(/ /g, '·').replace(/\t/g, '⇥').replace(/\n/g, '↵\n') : value;
}
function samples() {
  $('sample-input').textContent = current.kind==='plot'?'[No input]':displayText(current.sample.input);
  $('sample-output').textContent = current.kind==='plot'?'Matplotlib figure: match the data and chart requirements above.':displayText(current.sample.expected);
}
function hints() {
  const n = Math.min(draft().hints || 0, current.hints.length);
  $('hint-list').replaceChildren();
  current.hints.slice(0,n).forEach((h,i) => {
    const card = document.createElement('div'); card.className = 'hint-card';
    const label = document.createElement('small'); label.textContent = `HINT ${i+1}`;
    const content = document.createElement('div'); content.textContent = h;
    card.append(label,content); $('hint-list').append(card);
  });
  $('hint-count').textContent = `${n} / ${current.hints.length}`;
  $('hint').disabled = n >= current.hints.length;
  $('hint').textContent = n >= current.hints.length ? 'All hints revealed' : '＋ Show next hint';
}
function choose(id) {
  const target=allProblems.find(p=>p.id===id);
  const course=target?.course||state.course||'programming';
  if(course!==activeCourse||!problems.length){
    activeCourse=courses.some(c=>c.id===course)?course:'programming';
    problems=allProblems.filter(p=>p.course===activeCourse);
    $('course').value=activeCourse;
    $('exercise').replaceChildren();
    problems.forEach(p=>{const option=document.createElement('option');option.value=p.id;$('exercise').append(option);});
  }
  current = problems.find(p => p.id === id) || problems[0];
  state.selected = current.id;
  state.course=activeCourse;state.courseSelected=state.courseSelected||{};state.courseSelected[activeCourse]=current.id;
  const d = draft();
  $('exercise').value = current.id;
  const mathLessons={1:'PROBABILITY 機率',2:'VISUALIZATION 資料視覺化',3:'MATH & SYMPY 數學模組',4:'MATHEMATICAL MODELS 數學模型',5:'FUNCTIONS 函數',6:'LINEAR SYSTEMS 聯立方程式',7:'DISTANCES 距離',8:'INEQUALITIES 不等式',9:'QUADRATICS 二次函數',10:'LEAST SQUARES 最小平方法'};
  $('lesson').textContent = `LESSON ${String(current.lesson).padStart(2,'0')} / ${activeCourse==='ai-math'?mathLessons[current.lesson]:current.lesson===5 ? 'LOOPS 迴圈' : current.lesson===6 ? 'LISTS 串列' : current.lesson===4 ? 'CONDITIONS 條件判斷' : 'FUNDAMENTALS 基礎'}`;
  $('course-name').textContent=courses.find(c=>c.id===activeCourse)?.name||'';
  $('source-note').textContent=current.source||'';
  $('catalog-note').textContent=`BROWSER PYTHON · ${problems.length} EXERCISES`;
  $('problem-title').textContent = current.title;
  $('description').textContent = current.description;
  $('test-count').textContent = `${current.test_count} ${current.kind==='plot'?'CHART CHECK':'TEST CASES'}`;
  $('editor').value = d.code; $('stdin').value = d.input;
  $('solution-details').open = false; $('solution').textContent = '';
  $('previous').disabled = problems.indexOf(current) === 0;
  $('next').disabled = problems.indexOf(current) === problems.length-1;
  document.querySelector('.problem-scroll').scrollTop = 0;
  lastResult = null; renderTerminal(); hints(); samples(); lineNumbers(); progress(); save();
  $('run-status').textContent = 'Ready when you are';
}
async function api(path, data) {
  const response = await fetch(APP_BASE+path, data === undefined ? {} : {method:'POST', headers:{'Content-Type':'application/json','X-Practice-Request':'1'},body:JSON.stringify(data)});
  let result;
  try { result = await response.json(); } catch { throw new Error('The local server returned an unreadable response. Restart the app.'); }
  if (!response.ok) throw new Error(result.error || 'Local request failed.');
  return result;
}
function element(tag, className, text) { const e = document.createElement(tag); if(className)e.className=className; if(text!==undefined)e.textContent=text; return e; }
function outputBlock(parent, label, value, error=false) {
  parent.append(element('div','output-label',label),element('pre','output-pre'+(error?' error-text':''),displayText(value)));
}
function showCharts(parent,result){
  if(result.verification_error)parent.append(element('p','error-text',result.verification_error));
  for(const encoded of (result.images||[]).slice(0,4)){
    if(typeof encoded!=='string'||encoded.length>3000000||!/^[A-Za-z0-9+/=]+$/.test(encoded))continue;
    const image=element('img','chart-output');image.alt='Matplotlib chart produced by your program';image.src='data:image/png;base64,'+encoded;parent.append(image);
  }
}
const statusText = r => r.status === 'timeout' ? `Time limit exceeded (${r.milliseconds/1000} seconds). Check your loop condition and counter updates.` : r.status === 'output_limit' ? 'Output limit exceeded (128 KB). Check for an infinite printing loop.' : r.status === 'error' ? `Python error (exit ${r.exit_code}).` : '';
function renderTerminal() {
  const terminal = $('terminal'); terminal.replaceChildren();
  if (!lastResult) {
    const empty = element('div','empty-terminal'); empty.append(element('span','', '❯'));
    const p = element('p','','Your next solution starts here.'); p.append(element('small','','Run to experiment. Check to test every case.')); empty.append(p); terminal.append(empty); return;
  }
  const {kind, data} = lastResult;
  if (kind === 'error') { terminal.append(element('div','result-banner fail',data)); return; }
  if (kind === 'run') {
    terminal.append(element('div','output-label',`RUN · ${data.milliseconds} MS · ${data.status === 'ok' ? 'FINISHED' : data.status.toUpperCase()}`));
    outputBlock(terminal, 'STDOUT', data.stdout);
    if(data.stderr) outputBlock(terminal,'STDERR',data.stderr,true);
    if(statusText(data)) terminal.append(element('div','result-banner fail', statusText(data)));
    showCharts(terminal,data);
    return;
  }
  if (data.restriction) { terminal.append(element('div','result-banner fail',data.restriction)); return; }
  const passed = data.results.filter(r => r.passed).length;
  terminal.append(element('div','result-banner'+(data.passed?'':' fail'),data.passed ? `✓ All ${data.total} tests passed. Exercise complete!` : `${passed} / ${data.total} tests passed. ${data.results.length < data.total ? 'Remaining tests skipped after runner limit.' : 'Open a test to compare output.'}`));
  data.results.forEach((r,i) => {
    const box = element('details','case'); box.open = !r.passed && !data.results.slice(0,i).some(x=>!x.passed);
    const summary = element('summary'); summary.append(element('b', r.passed?'pass':'fail',r.passed?'✓':'×'),document.createTextNode(r.name),element('span','',`${r.milliseconds} ms`));
    const body = element('div','case-body'); outputBlock(body,'INPUT',r.input);
    const pair = element('div','output-pair'); const expected = element('div'), actual = element('div');
    outputBlock(expected,'EXPECTED',r.expected); outputBlock(actual,'ACTUAL',r.stdout,!r.passed); pair.append(expected,actual); body.append(pair);
    if(r.difference) body.append(element('div','mismatch',`First difference: line ${r.difference.line}, column ${r.difference.column}. Expected ${JSON.stringify(r.difference.expected)}; received ${JSON.stringify(r.difference.actual)}.`));
    if(r.stderr) outputBlock(body,'PYTHON ERROR',r.stderr,true);
    if(statusText(r)) body.append(element('div','error-text',statusText(r)));
    showCharts(body,r);
    box.append(summary,body); terminal.append(box);
  });
}
async function execute(kind) {
  if(busy)return;
  busy=true; $('run').disabled=true; $('check').disabled=true; $('course').disabled=true; $('exercise').disabled=true; $('previous').disabled=true; $('next').disabled=true;
  const p=current, code=$('editor').value, epoch=identityEpoch;
  $('run-status').textContent = kind==='check' ? (p.kind==='plot'?'Checking chart requirements…':`Checking ${p.test_count} test cases…`) : 'Running Python…';
  try {
    let input=$('stdin').value; if(!input.endsWith('\n'))input+='\n';
    const data=await api('/api/'+kind,{id:p.id,code,input}); if(epoch!==identityEpoch)return; lastResult={kind,data,code,id:p.id,input};
    if(kind==='check') { draft(p).passedCode=data.passed?code:null; if(data.passed)draft(p).completed=true; save(); progress(); }
    $('run-status').textContent=kind==='check'?(data.passed?'All tests passed':'Check results below'):(data.status==='ok'?'Run finished':statusText(data));
    renderTerminal();
  } catch(error) { if(epoch===identityEpoch){lastResult={kind:'error',data:error.message}; renderTerminal(); $('run-status').textContent='Connection or execution error';} }
  finally {busy=false; $('run').disabled=false; $('check').disabled=false; $('course').disabled=false; $('exercise').disabled=false; $('previous').disabled=problems.indexOf(current)===0; $('next').disabled=problems.indexOf(current)===problems.length-1;}
}
$('course').addEventListener('change',()=>{
  const selected=$('course').value;
  choose(state.courseSelected?.[selected]||allProblems.find(p=>p.course===selected).id);
});
$('exercise').addEventListener('change',()=>choose($('exercise').value));
$('previous').onclick=()=>choose(problems[problems.indexOf(current)-1].id);
$('next').onclick=()=>choose(problems[problems.indexOf(current)+1].id);
$('editor').addEventListener('input',()=>{draft().code=$('editor').value; save(); lineNumbers(); progress();});
$('editor').addEventListener('scroll',()=>$('line-numbers').scrollTop=$('editor').scrollTop);
['click','keyup'].forEach(event=>$('editor').addEventListener(event,lineNumbers));
$('editor').addEventListener('keydown',e=>{
  const editor=$('editor'),start=editor.selectionStart,end=editor.selectionEnd,value=editor.value;
  if(e.key==='Tab') {
    e.preventDefault();
    if(start===end&&!e.shiftKey) {editor.setRangeText('    ',start,end,'end');}
    else {
      const lineStart=value.lastIndexOf('\n',start-1)+1;
      const selected=value.slice(lineStart,end),lines=selected.split('\n');
      const replacement=lines.map(line=>e.shiftKey?line.replace(/^ {1,4}/,''):'    '+line).join('\n');
      editor.setRangeText(replacement,lineStart,end,'select');
    }
    editor.dispatchEvent(new Event('input'));
  } else if(e.key==='Enter'&&!e.ctrlKey&&!e.metaKey) {
    e.preventDefault(); const line=value.slice(value.lastIndexOf('\n',start-1)+1,start);
    const indent=(line.match(/^ */)||[''])[0]+(line.trimEnd().endsWith(':')?'    ':'');
    editor.setRangeText('\n'+indent,start,end,'end'); editor.dispatchEvent(new Event('input'));
  }
});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();if(current)execute(e.shiftKey?'check':'run');}});
$('stdin').addEventListener('input',()=>{draft().input=$('stdin').value;save();});
$('load-sample').onclick=()=>{$('stdin').value=current.sample.input;draft().input=$('stdin').value;save();toast('Sample input loaded.');};
$('run').onclick=()=>execute('run'); $('check').onclick=()=>execute('check');
$('reset').onclick=()=>{if(confirm('Reset the code for this exercise? Your current draft will be replaced.')){$('editor').value=starter(current);draft().code=$('editor').value;draft().passedCode=null;save();lineNumbers();progress();}};
$('hint').onclick=()=>{draft().hints=(draft().hints||0)+1;hints();save();};
$('solution-details').addEventListener('toggle',async()=>{
  if($('solution-details').open) {const p=current;try{const data=await api('/api/solution?id='+encodeURIComponent(p.id));if(current===p)$('solution').textContent=data.code;}catch(e){$('solution').textContent=e.message;}}
});
$('whitespace').onchange=()=>{samples();renderTerminal();};
$('backup').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,...state},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='python-practice-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
$('restore').onclick=()=>{if(busy){toast('Wait for the current run to finish.');return;}$('import-file').click();};
$('import-file').onchange=async()=>{
  const file=$('import-file').files[0];if(!file)return;
  try {
    if(file.size>5000000)throw new Error('Backup is too large.');
    const incoming=JSON.parse(await file.text());if(incoming.version!==1||!incoming.drafts||typeof incoming.drafts!=='object')throw new Error('Choose a Practice Lab progress backup.');
    const clean={};
    for(const p of allProblems){const d=incoming.drafts[p.id];if(d&&typeof d.code==='string'&&d.code.length<=40000&&typeof d.input==='string'&&d.input.length<=20000)clean[p.id]={code:d.code,input:d.input,hints:Number.isInteger(d.hints)?Math.max(0,Math.min(d.hints,p.hints.length)):0,passedCode:typeof d.passedCode==='string'?d.passedCode:null,completed:d.completed===true};}
    if(!confirm('Restore this backup? It will replace your current drafts and progress.'))return;
    state={selected:incoming.selected,drafts:clean};choose(state.selected);toast('Progress restored.');
  }catch(e){toast(e.message);}finally{$('import-file').value='';}
};
async function init(){
  try {
    [allProblems,courses]=await Promise.all([api('/api/problems'),api('/api/courses'),api('/api/health').then(h=>$('python-version').textContent=h.python)]);
    courses.forEach(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=c.name+' · '+c.count;$('course').append(o);});
    choose(state.selected); window.dispatchEvent(new Event('practice-ready'));
  }catch(e){$('problem-title').textContent='Could not load your practice set';$('description').textContent='Check your connection and reload this page. '+e.message;}
}
