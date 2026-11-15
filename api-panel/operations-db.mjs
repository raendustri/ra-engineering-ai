import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

// SQLite is the shared source of truth; clients must access the same server.
const TABLES = {
  machines: ['name','travel_x_mm','travel_y_mm','travel_z_mm','spindle_kw','max_rpm','hourly_eur','verified','notes'],
  tools: ['name','diameter_mm','flutes','type','verified','notes'],
  materials: ['name','code','density_g_cm3','price_try_kg','stock_kg','verified','notes'],
  customers: ['name','phone','email','notes'],
  orders: ['customer_id','title','quantity','status','due_date','notes'],
  trials: ['order_id','machine_id','material_id','tool_id','rpm','feed_mm_min','depth_mm','stepover_pct','outcome','verified','notes'],
  quotes: ['customer_id','order_id','material_id','machine_id','title','quantity','blank_x_mm','blank_y_mm','blank_z_mm','density_g_cm3','price_try_kg','machine_eur_hour','eur_try','cut_minutes_per_unit','setup_minutes','waste_pct','markup_pct','material_kg','material_total_try','machine_total_try','direct_total_try','offer_total_try','notes']
};
const WRITE_TABLES = new Set(Object.keys(TABLES).filter(t=>t!=='quotes'));
const REQUIRED_NAME = new Set(['machines','tools','materials','customers']);
const REAL_FIELDS = new Set(['travel_x_mm','travel_y_mm','travel_z_mm','spindle_kw','hourly_eur','diameter_mm','density_g_cm3','price_try_kg','stock_kg','feed_mm_min','depth_mm','stepover_pct','blank_x_mm','blank_y_mm','blank_z_mm','eur_try','cut_minutes_per_unit','setup_minutes','waste_pct','markup_pct','machine_eur_hour']);
const INTEGER_FIELDS = new Set(['max_rpm','flutes','customer_id','order_id','material_id','machine_id','tool_id','rpm','quantity','verified']);
const REQUIRED_POSITIVE = new Set(['quantity','blank_x_mm','blank_y_mm','blank_z_mm','density_g_cm3','eur_try','machine_eur_hour']);
const STATUSES = new Set(['new','quoted','approved','in_production','completed','invoiced','cancelled']);

function bad(message) { const error=new Error(message); error.status=400; throw error; }
function ensureNumber(field,value) {
  const n=Number(value);
  if (value===null || value==='' || !Number.isFinite(n) || n<0 || n>1e9) bad(`${field}: 0 ile 1 milyar arasinda sayi girin`);
  if (INTEGER_FIELDS.has(field) && !Number.isSafeInteger(n)) bad(`${field}: tam sayi gerekli`);
  if (REQUIRED_POSITIVE.has(field) && n<=0) bad(`${field}: 0'dan buyuk olmali`);
  if (field==='verified' && n!==0 && n!==1) bad('verified: 0 veya 1 olmali');
  if (field==='stepover_pct' && n>100 || field==='waste_pct' && n>100 || field==='markup_pct' && n>1000) bad(`${field}: yuzde siniri asildi`);
  return n;
}
function validate(table,data,{partial=false}={}) {
  if (!TABLES[table]) bad('Bilinmeyen kayit tipi');
  if (!data || typeof data!=='object' || Array.isArray(data)) bad('Gecersiz istek');
  const ret={};
  for (const [key,value] of Object.entries(data)) {
    if (!TABLES[table].includes(key)) bad(`Bilinmeyen alan: ${key}`);
    if (value==null || value==='') {ret[key]=null;continue;}
    if (REAL_FIELDS.has(key)||INTEGER_FIELDS.has(key)) {ret[key]=ensureNumber(key,value);continue;}
    if (typeof value!=='string') bad(`${key}: metin gerekli`);
    if (value.length>1000) bad(`${key}: cok uzun`);
    ret[key]=value.trim();
  }
  if (!partial) {
    if (REQUIRED_NAME.has(table)&&!ret.name) bad('Ad alani zorunlu');
    if (table==='orders' && !ret.title) bad('Siparis basligi zorunlu');
    if (table==='trials' && !ret.outcome) bad('Deneme sonucu zorunlu');
  }
  if (table==='orders' && ret.status!==undefined && ret.status!==null && !STATUSES.has(ret.status)) bad('Gecersiz siparis durumu');
  if (ret.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ret.email)) bad('E-posta formati gecersiz');
  if (ret.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(ret.due_date)) bad('Tarih YYYY-MM-DD olmali');
  return ret;
}
const round2=n=>Math.round((n+Number.EPSILON)*100)/100;
const num=(v,k,{positive=false,max=1e9}={})=>{
  const n=Number(v); if(v==='' || v==null || !Number.isFinite(n) || n<0 || n>max || positive&&n===0) bad(`${k}: gecersiz sayi`);
  return n;
};
export function calculateQuote(raw) {
  const quantity=num(raw.quantity,'Adet',{positive:true,max:100000});
  if (!Number.isInteger(quantity)) bad('Adet tam sayi olmali');
  const blank_x_mm=num(raw.blank_x_mm,'En',{positive:true});
  const blank_y_mm=num(raw.blank_y_mm,'Boy',{positive:true});
  const blank_z_mm=num(raw.blank_z_mm,'Kalinlik',{positive:true});
  const density_g_cm3=num(raw.density_g_cm3,'Yogunluk',{positive:true,max:100});
  const price_try_kg=num(raw.price_try_kg,'Malzeme kg fiyati');
  const machine_eur_hour=num(raw.machine_eur_hour,'Makine saat ucreti',{positive:true});
  const eur_try=num(raw.eur_try,'EUR TRY kuru',{positive:true});
  const cut_minutes_per_unit=num(raw.cut_minutes_per_unit,'Birim kesim suresi');
  const setup_minutes=num(raw.setup_minutes,'Kurulum suresi');
  const waste_pct=num(raw.waste_pct,'Fire orani',{max:100});
  const markup_pct=num(raw.markup_pct,'Fiyat ekleme orani',{max:1000});
  const material_kg=blank_x_mm*blank_y_mm*blank_z_mm/1e6*density_g_cm3*quantity;
  const material_total_try=material_kg*price_try_kg*(1+waste_pct/100);
  const machine_total_try=((cut_minutes_per_unit*quantity+setup_minutes)/60)*machine_eur_hour*eur_try;
  const direct_total_try=round2(material_total_try)+round2(machine_total_try);
  const offer_total_try=direct_total_try*(1+markup_pct/100);
  if (![material_kg,material_total_try,machine_total_try,direct_total_try,offer_total_try].every(Number.isFinite) || offer_total_try>1e12) bad('Hesaplama siniri asildi');
  return {quantity,blank_x_mm,blank_y_mm,blank_z_mm,density_g_cm3,price_try_kg,machine_eur_hour,eur_try,cut_minutes_per_unit,setup_minutes,waste_pct,markup_pct,
    material_kg:Math.round(material_kg*1e4)/1e4,material_total_try:round2(material_total_try),machine_total_try:round2(machine_total_try),direct_total_try:round2(direct_total_try),offer_total_try:round2(offer_total_try)};
}

export class OperationsDB {
  constructor(dbPath) {
    mkdirSync(path.dirname(dbPath),{recursive:true});
    this.db=new DatabaseSync(dbPath);
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS machines (id INTEGER PRIMARY KEY, name TEXT NOT NULL, travel_x_mm REAL, travel_y_mm REAL, travel_z_mm REAL, spindle_kw REAL, max_rpm INTEGER, hourly_eur REAL, verified INTEGER NOT NULL DEFAULT 0, notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS tools (id INTEGER PRIMARY KEY, name TEXT NOT NULL, diameter_mm REAL, flutes INTEGER, type TEXT, verified INTEGER NOT NULL DEFAULT 0, notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS materials (id INTEGER PRIMARY KEY, name TEXT NOT NULL, code TEXT, density_g_cm3 REAL, price_try_kg REAL, stock_kg REAL, verified INTEGER NOT NULL DEFAULT 0, notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT, email TEXT, notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers(id) ON DELETE RESTRICT, title TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','quoted','approved','in_production','completed','invoiced','cancelled')), due_date TEXT, notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS trials (id INTEGER PRIMARY KEY, order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL, machine_id INTEGER REFERENCES machines(id) ON DELETE SET NULL, material_id INTEGER REFERENCES materials(id) ON DELETE SET NULL, tool_id INTEGER REFERENCES tools(id) ON DELETE SET NULL, rpm INTEGER, feed_mm_min REAL, depth_mm REAL, stepover_pct REAL, outcome TEXT NOT NULL, verified INTEGER NOT NULL DEFAULT 0, notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS quotes (id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers(id) ON DELETE RESTRICT, order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL, material_id INTEGER REFERENCES materials(id) ON DELETE SET NULL, machine_id INTEGER REFERENCES machines(id) ON DELETE SET NULL, title TEXT NOT NULL, quantity INTEGER NOT NULL, blank_x_mm REAL NOT NULL, blank_y_mm REAL NOT NULL, blank_z_mm REAL NOT NULL, density_g_cm3 REAL NOT NULL, price_try_kg REAL NOT NULL, machine_eur_hour REAL NOT NULL, eur_try REAL NOT NULL, cut_minutes_per_unit REAL NOT NULL, setup_minutes REAL NOT NULL, waste_pct REAL NOT NULL, markup_pct REAL NOT NULL, material_kg REAL NOT NULL, material_total_try REAL NOT NULL, machine_total_try REAL NOT NULL, direct_total_try REAL NOT NULL, offer_total_try REAL NOT NULL, notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, entity TEXT NOT NULL, entity_id INTEGER NOT NULL, action TEXT NOT NULL, happened_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_trials_material ON trials(material_id);
      CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_id);`);
  }
  close(){this.db.close();}
  list(entity) {
    if(!TABLES[entity]) bad('Bilinmeyen liste');
    return this.db.prepare(`SELECT * FROM ${entity} ORDER BY id DESC LIMIT 250`).all();
  }
  overview(){
    const counts={};
    for(const table of Object.keys(TABLES)) counts[table]=this.db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n;
    const openOrders=this.db.prepare("SELECT count(*) AS n FROM orders WHERE status NOT IN ('completed','invoiced','cancelled')").get().n;
    const recentQuotes=this.db.prepare('SELECT id,title,offer_total_try,created_at FROM quotes ORDER BY id DESC LIMIT 5').all();
    return {counts,openOrders,recentQuotes};
  }
  create(entity,payload) {
    if(!TABLES[entity]) bad('Bilinmeyen kayit');
    let data;
    if(entity==='quotes') {
      if (typeof payload?.title!=='string'||!payload.title.trim()||payload.title.length>200) bad('Teklif basligi zorunlu');
      data={title:payload.title.trim(), notes:typeof payload.notes==='string'?payload.notes.slice(0,1000):null,...calculateQuote(payload)};
      for(const key of ['customer_id','order_id','material_id','machine_id']) if(payload[key]!=null&&payload[key]!=='') data[key]=ensureNumber(key,payload[key]);
    } else {
      data=validate(entity,payload);
      if(entity==='orders'&&data.quantity===undefined)data.quantity=1;
      if(entity==='orders'&&data.status===undefined)data.status='new';
      if((entity==='trials'||REQUIRED_NAME.has(entity))&&data.verified===undefined&&TABLES[entity].includes('verified'))data.verified=0;
    }
    const keys=Object.keys(data);if(!keys.length)bad('Bos kayit');
    try {
      const result=this.db.prepare(`INSERT INTO ${entity} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>data[k]));
      const id=Number(result.lastInsertRowid);
      this.db.prepare('INSERT INTO audit (entity,entity_id,action) VALUES (?,?,?)').run(entity,id,'create');
      return this.db.prepare(`SELECT * FROM ${entity} WHERE id=?`).get(id);
    }catch(e){if(e.code?.startsWith('ERR_SQLITE')||String(e.message).includes('FOREIGN KEY')||String(e.message).includes('CHECK constraint'))bad('Alan veya bagli kayit gecersiz');throw e;}
  }
  update(entity,id,payload) {
    if(!WRITE_TABLES.has(entity))bad('Bu kayit tipi degistirilemez');
    id=Number(id);if(!Number.isSafeInteger(id)||id<1)bad('Gecersiz kimlik');
    const data=validate(entity,payload,{partial:true});
    if (REQUIRED_NAME.has(entity)&&Object.hasOwn(data,'name')&&!data.name)bad('Ad bos olamaz');
    if(entity==='orders'&&Object.hasOwn(data,'title')&&!data.title)bad('Baslik bos olamaz');
    const keys=Object.keys(data);if(!keys.length)bad('Guncellenecek alan yok');
    const result=this.db.prepare(`UPDATE ${entity} SET ${keys.map(k=>`${k}=?`).join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(...keys.map(k=>data[k]),id);
    if (!result.changes) {const e=new Error('Kayit bulunamadi');e.status=404;throw e;}
    this.db.prepare('INSERT INTO audit (entity,entity_id,action) VALUES (?,?,?)').run(entity,id,'update');
    return this.db.prepare(`SELECT * FROM ${entity} WHERE id=?`).get(id);
  }
}
export const OP_ENTITIES=Object.freeze(Object.keys(TABLES));
