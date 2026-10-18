import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const root='/Users/jack/Desktop/My Apps/zombie-escape-study-game';
const require=createRequire(root+'/package.json');
const {chromium}=require('@playwright/test');
const child=spawn(process.execPath,[root+'/node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4176','--strictPort'],{cwd:root,stdio:['ignore','pipe','pipe']});
child.stdout.resume();child.stderr.resume();let browser;
try {
 for(let i=0;i<40;i++){try{const r=await fetch('http://127.0.0.1:4176/lab.html');if(r.ok)break;}catch{}if(i===39)throw Error('Preview did not start');await new Promise(r=>setTimeout(r,250));}
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],bridge=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(r.url().includes('/api/'))bridge.push(r.url());});
 await page.goto('http://127.0.0.1:4176/lab.html');await page.locator('#lab-message').filter({hasText:'Loaded'}).waitFor();
 await page.locator('#lab-all').click();await page.waitForFunction(()=>document.querySelectorAll('#lab-suite li[data-status="passed"]').length===12,{},{timeout:30000});
 if(bridge.length)throw Error('Production lab contacted study bridge');
 await page.locator('#lab-presets').selectOption('opening-crowd');await page.locator('#lab-load').click();await page.locator('#lab-run').click();await page.waitForFunction(()=>document.querySelector('#lab-status').textContent==='passed');
 await page.screenshot({path:'/tmp/gametest-production.png'});
 const lab=await page.evaluate(()=>({status:window.__gameTestLab.runner.status,tick:window.__gameTestLab.runner.tick,inside:window.__gameTestLab.runner.game.survivors.slice(1).filter(a=>a.y<28).length}));
 await page.goto('http://127.0.0.1:4176/');await page.locator('#start').click();await page.waitForFunction(()=>window.__deadAir?.game.status==='playing');
 if(errors.length)throw Error(errors.join('\n'));
 writeFileSync('/tmp/gametest-production.json',JSON.stringify({builtInPassed:12,lab,labBridgeRequests:0,normalGame:'playing',pageErrors:errors},null,2));
 console.log('Production lab: all 12 built-ins and opening replay passed; normal game starts; no lab bridge requests or page errors.');
} finally {await browser?.close();child.kill('SIGTERM');}
