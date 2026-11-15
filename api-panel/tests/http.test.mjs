import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(new URL('../server.mjs',import.meta.url)));
async function freePort(){return new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});});}
async function untilUp(url){for(let i=0;i<35;i++){try{const r=await fetch(url+'/api/status');if(r.ok)return;}catch{}await new Promise(ok=>setTimeout(ok,120));}throw new Error('Sunucu baslatilamadi');}
test('HTTP giris yetkisi, CRUD, teklif, bagimsiz istemci senkronu',async t=>{
 const folder=mkdtempSync(path.join(tmpdir(),'ra-http-'));const port=await freePort();const url=`http://127.0.0.1:${port}`;
 const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,OPENAI_ADMIN_KEY:'',DASHBOARD_PASSWORD:'temporary-test-secret-123',HOST:'127.0.0.1',PORT:String(port),RA_DB_PATH:path.join(folder,'test.sqlite')},stdio:'pipe'});
 t.after(()=>{child.kill();rmSync(folder,{recursive:true,force:true});});
 await untilUp(url);
 let r=await fetch(url+'/api/ops/customers');assert.equal(r.status,401);
 r=await fetch(url+'/operations');assert.equal(r.status,200);assert.match(await r.text(),/Üretim ve işletme merkezi/);
 r=await fetch(url+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:'temporary-test-secret-123'})});
 assert.equal(r.status,200);const cookie=r.headers.get('set-cookie').split(';')[0];assert.match(cookie,/ra_session=/);
 const json=async(path,method,body,extra={})=>{
   const res=await fetch(url+path,{method,headers:{Cookie:cookie,'Content-Type':'application/json',...extra},body:body?JSON.stringify(body):undefined});
   return {status:res.status,body:await res.json()};};
 let x=await json('/api/ops/customers','POST',{name:'İlk müşteri',email:'customer@example.com'});assert.equal(x.status,201);
 const customer=x.body.item;
 x=await json('/api/ops/orders','POST',{customer_id:customer.id,title:'CNC kesim',quantity:4,status:'new'});assert.equal(x.status,201);
 const order=x.body.item;
 x=await json('/api/ops/orders/'+order.id,'PATCH',{status:'in_production'});assert.equal(x.body.item.status,'in_production');
 x=await json('/api/ops/orders','GET');assert.equal(x.body.items.length,1);
 x=await json('/api/ops/overview','GET');assert.equal(x.body.openOrders,1);
 x=await json('/api/ops/materials','POST',{name:'POM',verified:0});assert.equal(x.status,201);
 x=await json('/api/ops/customers','POST',{name:'Fail',email:'invalid'});assert.equal(x.status,400);
 x=await json('/api/ops/customers','POST',{name:'Fail'}, {Origin:'https://evil.test'});assert.equal(x.status,403);
 const q={customer_id:customer.id,title:'Test quote',quantity:2,blank_x_mm:100,blank_y_mm:100,blank_z_mm:10,density_g_cm3:1.4,price_try_kg:100,machine_eur_hour:50,eur_try:50,cut_minutes_per_unit:10,setup_minutes:5,waste_pct:10,markup_pct:25};
 x=await json('/api/ops/quote-preview','POST',q);assert.equal(x.status,200);assert.equal(x.body.quote.offer_total_try,1340.59);
 x=await json('/api/ops/quotes','GET');assert.equal(x.body.items.length,0);
 x=await json('/api/ops/quotes','POST',q);assert.equal(x.status,201);assert.equal(x.body.item.offer_total_try,1340.59);
 r=await fetch(url+'/api/ops/quotes',{headers:{Cookie:cookie}});assert.equal((await r.json()).items[0].offer_total_try,1340.59);
});
