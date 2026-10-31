'use strict';
(async()=>{
  const status=document.getElementById('auth-status'),signIn=[document.getElementById('nav-sign-in'),document.getElementById('start-sign-in')],signUp=document.getElementById('start-sign-up'),enter=document.getElementById('enter-lab');
  try{
    const clerk=await practiceAuthReady,returnUrl=location.origin+'/python-practice';
    signIn.forEach(b=>{b.disabled=false;b.onclick=()=>clerk.openSignIn({forceRedirectUrl:returnUrl,signUpForceRedirectUrl:returnUrl});});
    signUp.disabled=false;signUp.onclick=()=>clerk.openSignUp({forceRedirectUrl:returnUrl,signInForceRedirectUrl:returnUrl});
    function render(){const signed=!!clerk.user;signIn.forEach(b=>b.hidden=signed);signUp.hidden=signed;enter.hidden=!signed;status.textContent=signed?'Signed in. Your practice workspace is ready.':'Sign in or create an account to enter the practice lab.';}
    enter.onclick=async event=>{event.preventDefault();try{status.textContent='Opening your workspace…';await clerk.session.getToken({skipCache:true});location.assign('/python-practice/lab');}catch{status.textContent='Please sign in again to open your workspace.';}};
    clerk.addListener(render);render();
  }catch(error){status.textContent=error.message;}
})();
