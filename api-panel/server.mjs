import http from 'node:http';
import {readFile, mkdir, writeFile, rename} from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {monthStartUTC, sumCosts, sumUsage, dailyUsage} from './metrics.mjs';
import {OperationsDB, OP_ENTITIES} from './operations-db.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root,'.data');
const balancePath = path.join(dataDir,'verified-balance.json');
// Keep this directory on persistent disk; it is NOT safe on ephemeral hosting.
const operationsDbPath = process.env.RA_DB_PATH || path.join(dataDir,'ra-operations.sqlite');
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4848);
const adminKey = (process.env.OPENAI_ADMIN_KEY || '').trim();
const projectId = (process.env.OPENAI_PROJECT_ID || '').trim();
const password = process.env.DASHBOARD_PASSWORD || '';
const trustProxy = process.env.TRUST_PROXY === 'true';
if (!password || password === 'BURAYA_UZUN_RASTGELE_BIR_SIFRE_YAZIN' || password.length < 14) {
  console.error('DASHBOARD_PASSWORD en az 14 karakter olmali. .env dosyanizi ayarlayin.');
  process.exit(1);
}
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error('PORT 1024-65535 araliginda olmali'); process.exit(1);
}

const salt = crypto.randomBytes(32);
const passwordHash = crypto.scryptSync(password, salt, 64);
const operations = new OperationsDB(operationsDbPath);
const sessions = new Map();
const attempts = new Map();
let cache = {until:0, value:null};

function json(res, status, data, headers={}) {
  const body=JSON.stringify(data);
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});
  res.end(body);
}
function cookieValue(req,name) {
  const found=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='));
  return found ? found.slice(name.length+1) : '';
}
function authenticated(req) {
  const session=cookieValue(req,'ra_session');
  const record=sessions.get(session);
  if (!record || record.expires < Date.now()) { sessions.delete(session); return false; }
  return true;
}
function sameOrigin(req) {
  const origin=req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}
function secureCookie(req) {
  return (req.socket.encrypted || (trustProxy && req.headers['x-forwarded-proto']==='https')) ? '; Secure' : '';
}
async function readJson(req) {
  const chunks=[]; let bytes=0;
  for await (const c of req) { bytes+=c.length; if (bytes > 4096) throw new Error('too_large'); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
async function readBalance() {
  try {
    const b=JSON.parse(await readFile(balancePath,'utf8'));
    if (typeof b.usd !== 'number' || !Number.isFinite(b.usd)) return null;
    return {usd:b.usd, verifiedAt:b.verifiedAt};
  } catch { return null; }
}
async function writeBalance(usd) {
  await mkdir(dataDir, {recursive:true});
  const value={usd, verifiedAt:new Date().toISOString()};
  const tmp=balancePath+'.'+crypto.randomBytes(8).toString('hex')+'.tmp';
  await writeFile(tmp,JSON.stringify(value),'utf8');
  await rename(tmp,balancePath);
  return value;
}
async function openaiPages(endpoint,params) {
  const all=[];
  let page;
  for (let i=0;i<12;i++) {
    const url=new URL('https://api.openai.com/v1'+endpoint);
    for (const [k,v] of Object.entries(params)) url.searchParams.set(k,String(v));
    if (projectId) url.searchParams.append('project_ids[]',projectId);
    if (page) url.searchParams.set('page',page);
    const res=await fetch(url, {headers:{Authorization:`Bearer ${adminKey}`}, signal:AbortSignal.timeout(14000)});
    if (!res.ok) {
      const detail=(await res.text()).slice(0,500);
      const err=new Error(`OpenAI HTTP ${res.status}: ${detail}`);
      err.code=res.status;
      throw err;
    }
    const payload=await res.json();
    all.push(...(payload.data || []));
    if (!payload.has_more || !payload.next_page) break;
    page=payload.next_page;
    if (i===11) throw new Error('Cok fazla rapor sayfasi; aralik daraltilmali');
  }
  return all;
}
async function metrics(force=false) {
  if (!adminKey) return {available:false,reason:'OPENAI_ADMIN_KEY ayarlanmadi. Kredi bilgisi manuel tutulabilir.'};
  if (!force && cache.until>Date.now()) return cache.value;
  const start=monthStartUTC();
  const end=Math.floor(Date.now()/1000);
  const params={start_time:start,end_time:end,bucket_width:'1d',limit:31};
  try {
    const [usage,cost]=await Promise.all([
      openaiPages('/organization/usage/completions',params),
      openaiPages('/organization/costs',{...params,limit:40})
    ]);
    const result={available:true, period:'Bu ay (UTC)',through:new Date().toISOString(), projectScope:projectId ? 'Bu OpenAI projesi' : 'Organizasyon geneli',
      usage:sumUsage(usage), daily:dailyUsage(usage).slice(-14), usd:sumCosts(cost),
      disclaimer:'Kullanim tokenleri metin / completions endpointine aittir. Diger arac maliyetleri toplam USD tutarina dahil olabilir. Raporlar gecikebilir.'};
    cache={until:Date.now()+5*60*1000,value:result};
    return result;
  } catch(e) {
    return {available:false,reason: e.code===401||e.code===403?'OpenAI yonetici anahtari gecersiz veya yetkisiz.':`API raporu alinamadi (${String(e.message).slice(0,130)}).`};
  }
}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
async function serveStatic(res,p) {
  const known = {'/':'index.html','/index.html':'index.html','/app.js':'app.js','/styles.css':'styles.css','/manifest.json':'manifest.json','/icon.svg':'icon.svg','/operations':'operations.html','/operations.html':'operations.html','/operations.js':'operations.js','/operations.css':'operations.css'};
  const name=known[p];
  if (!name) return json(res,404,{error:'Bulunamadi'});
  try {
    const content=await readFile(path.join(root,'public',name));
    res.writeHead(200,{'Content-Type':mime[path.extname(name)] || 'text/plain', 'Cache-Control':name==='index.html'?'no-store':'public, max-age=3600','X-Content-Type-Options':'nosniff'});
    res.end(content);
  } catch { json(res,404,{error:'Bulunamadi'}); }
}
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Frame-Options','SAMEORIGIN');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'");
  const p=new URL(req.url,'http://local').pathname;
  if (['POST','PATCH','PUT','DELETE'].includes(req.method) && !sameOrigin(req)) return json(res,403,{error:'Origin uyusmuyor'});
  if (p==='/api/status' && req.method==='GET') return json(res,200,{authenticated:authenticated(req), adminConfigured:!!adminKey});
  if (p==='/api/login' && req.method==='POST') {
    const address=req.socket.remoteAddress||'unknown';
    const state=attempts.get(address)||{count:0,until:0};
    if (state.count>=8 && state.until>Date.now()) return json(res,429,{error:'Cok fazla deneme. 15 dakika sonra yeniden deneyin.'});
    let body;
    try {body=await readJson(req);} catch {return json(res,400,{error:'Gecersiz istek'});}
    const inputHash=crypto.scryptSync(String(body.password||'').slice(0,200),salt,64);
    if (!crypto.timingSafeEqual(passwordHash,inputHash)) {
      const next={count:state.until>Date.now()?state.count+1:1,until:Date.now()+15*60*1000};
      attempts.set(address,next);
      return json(res,401,{error:'Sifre hatali'});
    }
    attempts.delete(address);
    const token=crypto.randomBytes(32).toString('hex');
    sessions.set(token,{expires:Date.now()+12*60*60*1000});
    return json(res,200,{ok:true},{'Set-Cookie':`ra_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secureCookie(req)}`});
  }
  if (p==='/api/logout' && req.method==='POST') {
    sessions.delete(cookieValue(req,'ra_session'));
    return json(res,200,{ok:true},{'Set-Cookie':`ra_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secureCookie(req)}`});
  }
  if (p.startsWith('/api/') && !authenticated(req)) return json(res,401,{error:'Giris yapmaniz gerekiyor'});
  if (p.startsWith('/api/ops/')) {
    const fragments=p.slice('/api/ops/'.length).split('/');
    const [entity, id, extra] = fragments;
    if (extra || !entity) return json(res,404,{error:'Bulunamadi'});
    try {
      if (entity==='overview' && !id && req.method==='GET') return json(res,200,operations.overview());
      if (!OP_ENTITIES.includes(entity)) return json(res,404,{error:'Kayit tipi bulunamadi'});
      if (!id && req.method==='GET') return json(res,200,{items:operations.list(entity)});
      if (!id && req.method==='POST') return json(res,201,{item:operations.create(entity,await readJson(req))});
      if (id && req.method==='PATCH') return json(res,200,{item:operations.update(entity,id,await readJson(req))});
      return json(res,405,{error:'Yontem desteklenmiyor'});
    } catch(e) {
      const message = e instanceof SyntaxError ? 'Gecersiz JSON' : (e.message==='too_large' ? 'Istek cok buyuk' : e.message);
      return json(res,e.status||400,{error:String(message).slice(0,220)});
    }
  }
  if (p==='/api/summary' && req.method==='GET') {
    const m=await metrics(req.url.includes('refresh=1'));
    return json(res,200,{balance:await readBalance(),metrics:m});
  }
  if (p==='/api/balance' && req.method==='POST') {
    let body;try {body=await readJson(req);}catch{return json(res,400,{error:'Gecersiz JSON'});}
    const usd=Number(body.usd);
    if (body.usd===''||body.usd==null||!Number.isFinite(usd)||usd<0||usd>10000000) return json(res,400,{error:'Bakiye 0 veya pozitif USD tutari olmali'});
    return json(res,200,{balance:await writeBalance(Math.round(usd*100)/100)});
  }
  if (req.method==='GET' && !p.startsWith('/api/')) return serveStatic(res,p);
  return json(res,404,{error:'Bulunamadi'});
});
server.listen(port,host,()=>console.log(`RA API Paneli: http://${host}:${port} (ag guvenligine dikkat edin)`));
