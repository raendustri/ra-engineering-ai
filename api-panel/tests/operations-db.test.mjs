import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {OperationsDB,calculateQuote} from '../operations-db.mjs';
function fixture(t){const temp=mkdtempSync(path.join(tmpdir(),'ra-ops-'));const db=new OperationsDB(path.join(temp,'records.sqlite'));t.after(()=>{db.close();rmSync(temp,{recursive:true,force:true});});return db;}
test('malzeme, makine, takim, musteri, siparis, deneme kalici kayitlari',t=>{
 const db=fixture(t);const machine=db.create('machines',{name:'Router test',spindle_kw:5.5,verified:0});
 const material=db.create('materials',{name:'POM test',density_g_cm3:1.41,price_try_kg:200,verified:0});
 const tool=db.create('tools',{name:'Z1 6mm',diameter_mm:6,flutes:1});
 const customer=db.create('customers',{name:'Deneme Müşterisi',email:'test@example.com'});
 const order=db.create('orders',{customer_id:customer.id,title:'Daire flans',quantity:10,status:'new'});
 const trial=db.create('trials',{order_id:order.id,material_id:material.id,machine_id:machine.id,tool_id:tool.id,rpm:18000,feed_mm_min:1900,outcome:'Yüzey kontrol edilmeli',verified:0});
 assert.equal(db.list('machines').length,1);assert.equal(db.list('trials')[0].id,trial.id);
 assert.equal(db.update('orders',order.id,{status:'completed'}).status,'completed');
 assert.equal(db.overview().openOrders,0);
 assert.throws(()=>db.update('trials',trial.id,{verified:3}),/verified/);
 assert.throws(()=>db.create('orders',{title:'Yanlis',customer_id:99999}),/bagli kayit/);
 const p=db.db.prepare('PRAGMA database_list').all();assert.ok(p[0].file.includes('records.sqlite'));
});
test('CNC teklif hesabi: hacim, kg, fire, baglama, fiyat',t=>{
 const db=fixture(t);
 const input={title:'Deneme teklif',quantity:2,blank_x_mm:100,blank_y_mm:100,blank_z_mm:10,density_g_cm3:1.4,price_try_kg:100,machine_eur_hour:50,eur_try:50,cut_minutes_per_unit:10,setup_minutes:5,waste_pct:10,markup_pct:25};
 const quote=calculateQuote(input);
 assert.equal(quote.material_kg,0.28);
 assert.equal(quote.material_total_try,30.8);
 assert.equal(quote.machine_total_try,1041.67);
 assert.equal(quote.direct_total_try,1072.47);
 assert.equal(quote.offer_total_try,1340.59);
 const stored=db.create('quotes',input);assert.equal(stored.offer_total_try,1340.59);
 assert.throws(()=>calculateQuote({...input,eur_try:0}),/EUR TRY/);
 assert.throws(()=>calculateQuote({...input,quantity:-1}),/Adet/);
 assert.throws(()=>db.create('machines',{name:'Test',bad_field:'DROP TABLE machines'}),/Bilinmeyen alan/);
});
test('SQLite kalicilik yeniden acilista korunuyor',t=>{
 const folder=mkdtempSync(path.join(tmpdir(),'ra-persist-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
 const file=path.join(folder,'shared.sqlite');let db=new OperationsDB(file);
 db.create('materials',{name:'PE1000',code:'PE-UHMW'});db.close();db=new OperationsDB(file);assert.equal(db.list('materials')[0].name,'PE1000');db.close();
});
