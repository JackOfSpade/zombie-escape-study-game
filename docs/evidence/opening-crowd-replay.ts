import {createGame} from '/Users/jack/Desktop/My Apps/zombie-escape-study-game/src/world.ts';
import {step} from '/Users/jack/Desktop/My Apps/zombie-escape-study-game/src/engine.ts';
import {distance} from '/Users/jack/Desktop/My Apps/zombie-escape-study-game/src/model.ts';
import {readFileSync} from 'node:fs';
const r=JSON.parse(readFileSync('public/curriculum.json','utf8'));
for(const seed of [4089087021,3271305014,11]) {
 const g=createGame(seed,r);g.status='playing';g.nextSpawn=1e9;g.surge.anchor=1e9;
 let reversals=0; const headings=new Map(); const path=new Map();const samples=[];
 for(let i=0;i<300;i++) {
  step(g,1/30);
  for(const a of g.survivors.slice(1)){
   const h=headings.get(a.id);if(h && h.x*a.heading.x+h.y*a.heading.y<-.5) reversals++;
   headings.set(a.id,{...a.heading});
  }
  if([125,299].includes(i))samples.push({time:g.time,inside:g.survivors.slice(1).filter(a=>a.y<28).length,working:g.survivors.slice(1).filter(a=>a.activity==='studying'||a.activity==='defending').length,exploring:g.survivors.slice(1).filter(a=>a.activity==='exploring').map(a=>({id:a.id,x:+a.x.toFixed(2),y:+a.y.toFixed(2),target:a.target,path:a.path.slice(0,2)}))});
 }
 console.log(JSON.stringify({seed,reversals,samples}));
}
