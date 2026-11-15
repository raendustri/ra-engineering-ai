const $ = id => document.getElementById(id);
const number = n => new Intl.NumberFormat('tr-TR').format(n);
const usd = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const date = s => new Date(s).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
const set = (id,v) => {$(id).textContent=v;};
async function api(url,opts) {
  const r=await fetch(url,{credentials:'same-origin',headers:{'Content-Type':'application/json'},...opts});
  const body=await r.json();
  if (!r.ok) throw new Error(body.error || 'İstek başarısız');
  return body;
}
function showLogin(isLogin) {
  $('login').hidden=!isLogin;
  $('dashboard').hidden=isLogin;
  $('logout').hidden=isLogin;
}
function drawChart(data) {
  const el=$('chart');el.replaceChildren();
  if (!data?.length) { const p=document.createElement('p');p.className='muted';p.textContent='Henüz token verisi yok.';el.append(p);return; }
  const max=Math.max(1,...data.map(x=>x.input+x.output));
  for (const row of data) {
    const group=document.createElement('div');group.className='chartgroup';
    group.title=`${row.date}: giriş ${number(row.input)} • çıkış ${number(row.output)}`;
    const bars=document.createElement('div');bars.className='bars';
    const a=document.createElement('div');a.className='bar input';a.style.height=Math.max(2,Math.round(row.input/max*130))+'px';
    const b=document.createElement('div');b.className='bar output';b.style.height=Math.max(2,Math.round(row.output/max*130))+'px';
    bars.append(a,b);
    const label=document.createElement('span');label.textContent=row.date.slice(8,10);
    group.append(bars,label);el.append(group);
  }
}
async function load(force=false) {
  $('refresh').disabled=true;$('refresh').textContent='Güncelleniyor…';
  try {
    const r=await api('/api/summary'+(force?'?refresh=1':''));
    const b=r.balance;
    set('balance',b?usd(b.usd):'—');
    set('balanceAt',b?'Son doğrulama: '+date(b.verifiedAt):'Henüz bakiye kaydı girilmedi');
    const m=r.metrics;
    if (m.available) {
      set('spent',usd(m.usd));set('inputTokens',number(m.usage.input));set('outputTokens',number(m.usage.output));
      set('requests',number(m.usage.requests));set('cachedTokens',number(m.usage.cached));
      set('scope',m.projectScope);set('apiStatus','Bağlı');$('apiStatus').className='connected';
      set('apiNote',m.disclaimer+' Son kontrol: '+date(m.through));drawChart(m.daily);
    } else {
      for (const id of ['spent','inputTokens','outputTokens','requests','cachedTokens']) set(id,'—');
      set('scope','—');set('apiStatus','Bağlı değil');$('apiStatus').className='disconnected';
      set('apiNote',m.reason||'Rapor alınamadı');drawChart([]);
    }
  } catch(e) {if (e.message==='Giris yapmaniz gerekiyor') return showLogin(true);set('apiNote',e.message);}
  finally {$('refresh').disabled=false;$('refresh').textContent='↻ Yenile';}
}
$('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();set('loginError','');
  try { await api('/api/login',{method:'POST',body:JSON.stringify({password:$('password').value})});$('password').value='';showLogin(false);await load(); }
  catch(e){set('loginError',e.message);}
});
$('logout').addEventListener('click',async()=>{await api('/api/logout',{method:'POST'});showLogin(true);});
$('refresh').addEventListener('click',()=>load(true));
$('openBalance').addEventListener('click',()=>{$('balanceDialog').showModal();});
$('cancelBalance').addEventListener('click',()=>{$('balanceDialog').close();});
$('balanceForm').addEventListener('submit',async e=>{
  e.preventDefault();set('balanceError','');
  try {await api('/api/balance',{method:'POST',body:JSON.stringify({usd:Number($('usd').value)})});$('balanceDialog').close();$('usd').value='';await load();}
  catch(e){set('balanceError',e.message);}
});
api('/api/status').then(r=>{showLogin(!r.authenticated);if(r.authenticated)load();}).catch(()=>{showLogin(true);set('loginError','Sunucuya erişilemiyor.');});