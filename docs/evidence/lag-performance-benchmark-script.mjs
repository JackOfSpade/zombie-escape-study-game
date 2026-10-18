import {createRequire} from 'node:module';
import {mkdtempSync,realpathSync,symlinkSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=process.cwd(),require=createRequire(root+'/package.json');
const {chromium}=require('@playwright/test');
const {createServer}=await import(pathToFileURL(require.resolve('vite')).href);
const baseline=realpathSync(mkdtempSync(join(tmpdir(),'game-lag-baseline-')));
let server,browser;
try {
 execFileSync('tar',['-xzf',root+'/docs/evidence/agent-game-tests-source.tar.gz','-C',baseline]);
 symlinkSync(root+'/node_modules',baseline+'/node_modules','dir');
 server=await createServer({root:baseline,configFile:join(baseline,'vite.config.ts'),cacheDir:join(baseline,'.vite-benchmark'),server:{host:'127.0.0.1',port:5174,strictPort:true}});await server.listen();
 browser=await chromium.launch({headless:true});
 const pages={};
 for(const [name,port] of [['before',5174],['after',5173]]){pages[name]=await browser.newPage({viewport:{width:1440,height:1000}});pages[name].on('pageerror', e=>console.error(name,e.message));await pages[name].goto(`http://127.0.0.1:${port}/lab.html`);}
 const scenario=JSON.parse(readFileSync(root+'/tests/fixtures/gametest/lag-seed-opening.json','utf8'));
 const runs={before:[],after:[]};
 for(let repeat=0;repeat<4;repeat++) for(const name of repeat%2?['after','before']:['before','after']){
   const result=await pages[name].evaluate(async(s)=>{
     const {TestRunner}=await import('/src/gametest/runner.ts'),{render}=await import('/src/render.ts');
     const roadmap=await(await fetch('/curriculum.json')).json(),runner=new TestRunner(s,roadmap),costs=[];
     for(let i=0;i<s.maxTicks;i++){const started=performance.now();runner.advance();costs.push(performance.now()-started);}
     const g=runner.game;
     const canvas=document.createElement('canvas');canvas.style.width='1200px';canvas.style.height='800px';document.body.append(canvas);
     const drawing=[];
     await new Promise(resolve=>{const frame=()=>{const started=performance.now();render(canvas,g);drawing.push(performance.now()-started);if(drawing.length<60)requestAnimationFrame(frame);else resolve()};requestAnimationFrame(frame)});
     canvas.remove();
     const states={actors:g.survivors.map(a=>({id:a.id,x:a.x,y:a.y,hp:a.hp,floor:a.floor})),zombies:g.zombies,furniture:g.floors.map(f=>f.furniture),rng:g.rng,time:g.time};
     return {costs,drawing,status:runner.status,state:JSON.stringify(states)};
   },scenario);
   const hash=createHash('sha256').update(result.state).digest('hex');
   if(repeat)runs[name].push({costs:result.costs,drawing:result.drawing,status:result.status,worldHash:hash});
 }
 const stats=a=>{const sorted=[...a].sort((a,b)=>a-b);return {mean:a.reduce((a,b)=>a+b,0)/a.length,p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1)}};
 const report={seed:scenario.seed,scenario:scenario.id,repeats:3,warmups:1,scope:'Fresh synthetic 30-second TestRunner worlds. Real game AI/physics; same normal-health stationary indoor player. Alternating baseline/current runs; render measured on requestAnimationFrame, not a tight drawing loop.',before:{engine:stats(runs.before.flatMap(r=>r.costs)),render:stats(runs.before.flatMap(r=>r.drawing))},after:{engine:stats(runs.after.flatMap(r=>r.costs)),render:stats(runs.after.flatMap(r=>r.drawing))},identicalWorlds:new Set([...runs.before,...runs.after].map(r=>r.worldHash)).size===1,allPassed:[...runs.before,...runs.after].every(r=>r.status==='passed')};
 writeFileSync('/tmp/game-lag-benchmark.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 if(!report.identicalWorlds||!report.allPassed)process.exitCode=1;
}finally{await browser?.close();await server?.close();rmSync(baseline,{recursive:true,force:true});}
