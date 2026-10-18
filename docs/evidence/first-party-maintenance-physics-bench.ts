import fs from 'node:fs';import {createHash} from 'node:crypto';
import {createGame} from '../../src/world.ts';
import {beginPhysics,finishPhysics,physicsMove} from '../../src/physics.ts';
const r=JSON.parse(fs.readFileSync('public/curriculum.json','utf8')),g=createGame(11,r);g.survivors=g.survivors.slice(0,1);g.survivors[0].x=2;g.survivors[0].y=2;
for(const f of g.floors){f.tiles=Array.from({length:34},()=>Array(44).fill(0));f.furniture=[];}
g.zombies=Array.from({length:120},(_,i)=>({id:`b${i}`,x:4+(i%20)*.8,y:4+Math.floor(i/20)*.8,floor:0,hp:60,path:[],repath:0,cooldown:0,memory:0,stagger:0,origin:'outside' as const}));
const start=performance.now();for(let i=0;i<600;i++){beginPhysics(g);physicsMove(g,g.survivors[0],.02,0);finishPhysics(g,1/30);}console.log(JSON.stringify({ticks:600,bodies:121,wallMs:performance.now()-start,worldHash:createHash('sha256').update(JSON.stringify({actors:g.survivors.map(({x,y,physics})=>({x,y,physics})),zombies:g.zombies.map(({x,y,physics})=>({x,y,physics}))})).digest('hex')}));
