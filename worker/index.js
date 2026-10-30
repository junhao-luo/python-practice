export default {
  async fetch(request,env={}){
    const url=new URL(request.url),path=url.pathname.replace(/^\/python-practice(?=\/|$)/,'')||'/';
    if(request.method==='POST'&&path==='/api/ai')return review(request,env);
    if(request.method!=='GET')return json({error:'Method not allowed.'},405);
    if(path==='/api/auth-config')return json({enabled:!!(env.CLERK_PUBLISHABLE_KEY&&env.CLERK_SECRET_KEY),publishableKey:env.CLERK_PUBLISHABLE_KEY||null,vaultEnabled:!!env.AI_KEY_ENCRYPTION_KEY});
    if(path==='/api/health')return json({app:'online-python-practice',python:'browser',aiConfigured:env.PUBLIC_APP!=='1'&&!!env.GEMINI_API_KEY,model:env.GEMINI_MODEL||modelDefault,providers:Object.keys(providers)});
    if(path==='/api/courses')return json(COURSES.map(c=>({...c,count:PROBLEMS.filter(p=>p.course===c.id).length})));
    if(path==='/api/problems'){
      const course=url.searchParams.get('course');
      if(course&&!COURSES.some(c=>c.id===course))return json({error:'Unknown course.'},400);
      return json(PROBLEMS.filter(p=>!course||p.course===course).map(({solution,tests,verification,...p})=>({...p,sample:tests[0],test_count:tests.length})));
    }
    if(path==='/api/solution'){const p=PROBLEMS.find(p=>p.id===url.searchParams.get('id'));return p?json({code:p.solution}):json({error:'Unknown exercise.'},404);}
    if(path==='/api/tests'){const p=PROBLEMS.find(p=>p.id===url.searchParams.get('id'));return p?json({tests:p.tests,rule:p.rule,packages:p.packages||[],verification:p.verification||'',timeLimit:p.course==='ai-math'?10000:2500}):json({error:'Unknown exercise.'},404);}
    if(Object.hasOwn(ASSETS,path)){
      const mime=path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html';
      const assetHeaders={...headers,'Content-Type':mime+'; charset=utf-8'};
      if(path!=='/sandbox.html'&&env.CLERK_PUBLISHABLE_KEY){
        try{
          const domain=atob(env.CLERK_PUBLISHABLE_KEY.split('_')[2]).replace(/\$$/,'');
          if(/^[a-z0-9.-]+$/.test(domain)){
            const clerkOrigin='https://'+domain;
            assetHeaders['Content-Security-Policy']=`default-src 'self'; script-src 'self' ${clerkOrigin} https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; connect-src 'self' ${clerkOrigin} https://clerk-telemetry.com; frame-src 'self' ${clerkOrigin} https://challenges.cloudflare.com; img-src 'self' data: ${clerkOrigin} https://img.clerk.com https://images.clerk.dev; font-src 'self' data:; worker-src blob:; base-uri 'none'; object-src 'none'`;
          }
        }catch{}
      }
      if(path==='/sandbox.html')assetHeaders['Content-Security-Policy']=`default-src 'none'; script-src 'wasm-unsafe-eval' blob: https://eljhon.me https://python-practice-chi.vercel.app ${url.origin} https://cdn.jsdelivr.net; worker-src blob:; connect-src https://cdn.jsdelivr.net; style-src 'none'; base-uri 'none'; object-src 'none'`;
      return new Response(ASSETS[path],{headers:assetHeaders});
    }
    return json({error:'Not found.'},404);
  }
};
