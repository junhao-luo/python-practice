'use strict';
const practiceBrand={
  signIn:{start:{title:'Sign in to Python Practice Lab',subtitle:'Continue your programming and AI mathematics practice'},password:{title:'Sign in to Python Practice Lab',subtitle:'Continue your practice'},emailCode:{title:'Check your email',subtitle:'Continue to Python Practice Lab'}},
  signUp:{start:{title:'Create your Python Practice Lab account',subtitle:'Save your practice progress across devices'},emailCode:{title:'Verify your email',subtitle:'Create your Python Practice Lab account'}}
};
const practiceAuthReady=(async()=>{
  const response=await fetch('/python-practice/api/auth-config');
  if(!response.ok)throw Error('Sign-in could not connect. Please reload.');
  const config=await response.json();if(!config.enabled)throw Error('Sign-in is unavailable. Please try again later.');
  const domain=atob(config.publishableKey.split('_')[2]).replace(/\$$/,'');
  if(!/^[a-z0-9.-]+$/.test(domain))throw Error('Invalid sign-in configuration.');
  async function script(src,key){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=true;s.crossOrigin='anonymous';if(key)s.dataset.clerkPublishableKey=key;s.onload=resolve;s.onerror=()=>reject(Error('Sign-in could not load. Please reload.'));document.head.append(s);});}
  await script(`https://${domain}/npm/@clerk/ui@1/dist/ui.browser.js`);
  await script(`https://${domain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`,config.publishableKey);
  await window.Clerk.load({ui:{ClerkUI:window.__internal_ClerkUICtor},localization:practiceBrand});
  return window.Clerk;
})();
// Consumers show an actionable error; prevent an early unhandled rejection.
practiceAuthReady.catch(()=>{});
