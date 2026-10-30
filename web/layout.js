'use strict';
// Layout preferences are device-only and contain no account or program data.
const layoutStorage='practice-panel-layout-v1';
let panelLayout={};
try{const saved=JSON.parse(localStorage.getItem(layoutStorage));if(saved&&typeof saved==='object')panelLayout=saved;}catch{}
function setupDivider(parent,property,key,vertical,defaultValue,minPixels,maxPixels){
  const area=document.querySelector(parent),handle=document.createElement('div');
  handle.className='panel-divider '+key;
  handle.setAttribute('role','separator');handle.setAttribute('aria-orientation',vertical?'vertical':'horizontal');
  handle.setAttribute('aria-label',key==='problem'?'Resize problem and coding panels':key==='editor'?'Resize editor and terminal':'Resize terminal input and output');
  handle.tabIndex=0;handle.title='Drag to resize. Arrow keys also adjust; double-click to reset.';
  area.append(handle);
  function limits(){const size=vertical?area.getBoundingClientRect().width:area.getBoundingClientRect().height;return {low:Math.min(45,minPixels/size*100),high:Math.max(55,100-maxPixels/size*100)};}
  function value(){
    const saved=Number.parseFloat(area.style.getPropertyValue(property));if(Number.isFinite(saved))return saved;
    const rect=area.getBoundingClientRect(),child=area.firstElementChild.getBoundingClientRect();
    return vertical?child.width/rect.width*100:child.height/rect.height*100;
  }
  function apply(next){
    const {low,high}=limits(),safe=Math.max(low,Math.min(high,next));
    area.style.setProperty(property,safe+'%');
    handle.setAttribute('aria-valuemin',String(Math.round(low)));handle.setAttribute('aria-valuemax',String(Math.round(high)));handle.setAttribute('aria-valuenow',String(Math.round(safe)));
    panelLayout[key]=safe;
  }
  function persist(){try{localStorage.setItem(layoutStorage,JSON.stringify(panelLayout));}catch{}}
  if(Number.isFinite(panelLayout[key])&&panelLayout[key]>=5&&panelLayout[key]<=95)apply(panelLayout[key]);
  else{handle.setAttribute('aria-valuenow',String(defaultValue));handle.setAttribute('aria-valuemin','5');handle.setAttribute('aria-valuemax','95');}
  let dragging=false;
  handle.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;event.preventDefault();handle.focus();dragging=true;
    handle.setPointerCapture(event.pointerId);document.body.classList.add(vertical?'resizing-columns':'resizing-rows');
  });
  handle.addEventListener('pointermove',event=>{
    if(!dragging)return;
    const rect=area.getBoundingClientRect();
    apply(vertical?(event.clientX-rect.left)/rect.width*100:(event.clientY-rect.top)/rect.height*100);
  });
  function finish(){if(!dragging)return;dragging=false;document.body.classList.remove('resizing-columns','resizing-rows');persist();}
  handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);handle.addEventListener('lostpointercapture',finish);
  handle.addEventListener('keydown',event=>{
    const minus=vertical?'ArrowLeft':'ArrowUp',plus=vertical?'ArrowRight':'ArrowDown';
    if(![minus,plus,'Home','End'].includes(event.key))return;event.preventDefault();
    const {low,high}=limits();apply(event.key==='Home'?low:event.key==='End'?high:value()+(event.key===minus?-1:1)*(event.shiftKey?10:2));persist();
  });
  handle.addEventListener('dblclick',()=>{area.style.removeProperty(property);delete panelLayout[key];handle.setAttribute('aria-valuenow',String(defaultValue));persist();});
}
setupDivider('.workspace','--problem-width','problem',true,39,280,350);
setupDivider('.coding-panel','--editor-height','editor',false,57,180,180);
setupDivider('.terminal-body','--input-width','input',true,27,100,180);
