const $=id=>document.getElementById(id);
const fmt=n=>new Intl.NumberFormat('tr-TR',{maximumFractionDigits:2}).format(n);
const money=n=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(n);
const STATUSES={new:'Yeni',quoted:'Teklif verildi',approved:'Onaylandı',in_production:'Üretimde',completed:'Tamamlandı',invoiced:'Faturalandı',cancelled:'İptal'};
const F=(key,label,type='text',extra={})=>({key,label,type,...extra});
const sections={
  machines:{name:'Makineler',desc:'Makine profili, ölçüler ve saatlik işleme bedeli. Kaydedilen değerleri doğrulayın.',cols:['id','name','spindle_kw','max_rpm','hourly_eur','verified'],fields:[F('name','Makine adı'),F('travel_x_mm','X alanı (mm)','number'),F('travel_y_mm','Y alanı (mm)','number'),F('travel_z_mm','Z hareketi (mm)','number'),F('spindle_kw','Spindle kW','number'),F('max_rpm','Maks. devir (rpm)','number'),F('hourly_eur','Saatlik bedel (EUR)','number',{default:50}),F('verified','Bilgi doğrulandı mı?','boolean',{default:0}),F('notes','Notlar','textarea')]},
  tools:{name:'Frezeler',desc:'Frezeler ve deneme sonuçları için ortak takım listesi.',cols:['id','name','diameter_mm','flutes','type','verified'],fields:[F('name','Takım adı / kodu'),F('diameter_mm','Çap (mm)','number'),F('flutes','Ağız sayısı','number'),F('type','Takım türü'),F('verified','Bilgi doğrulandı mı?','boolean',{default:0}),F('notes','Notlar','textarea')]},
  materials:{name:'Malzemeler',desc:'Malzeme yoğunluğu ve güncel alış fiyatı kullanıcı tarafından doğrulanır.',cols:['id','name','code','density_g_cm3','price_try_kg','stock_kg','verified'],fields:[F('name','Malzeme adı'),F('code','Kod / sınıf'),F('density_g_cm3','Yoğunluk (g/cm³)','number'),F('price_try_kg','Alış fiyatı (TL/kg)','number'),F('stock_kg','Stok (kg)','number'),F('verified','Bilgi doğrulandı mı?','boolean',{default:0}),F('notes','Notlar','textarea')]},
  customers:{name:'Müşteriler',desc:'Müşteri ve iletişim bilgileri. Kişisel verileri yalnızca yetkili kullanıcılar görmeli.',cols:['id','name','phone','email'],fields:[F('name','Müşteri / firma adı'),F('phone','Telefon','tel'),F('email','E-posta','email'),F('notes','Notlar','textarea')]},
  orders:{name:'Siparişler',desc:'Müşteri, iş durumu ve teslim bilgileri.',cols:['id','customer_id','title','quantity','status','due_date'],fields:[F('customer_id','Müşteri','ref',{entity:'customers'}),F('title','İş / sipariş açıklaması'),F('quantity','Adet','number',{default:1}),F('status','Durum','status',{default:'new'}),F('due_date','Teslim tarihi','date'),F('notes','Notlar','textarea')]},
  trials:{name:'Denemeler',desc:'Gerçek işleme deneylerini kaydet; doğrulanmamış parametreleri güvenli değer sayma.',cols:['id','material_id','tool_id','machine_id','rpm','feed_mm_min','outcome','verified'],fields:[F('order_id','İlişkili iş','ref',{entity:'orders'}),F('machine_id','Makine','ref',{entity:'machines'}),F('material_id','Malzeme','ref',{entity:'materials'}),F('tool_id','Freze','ref',{entity:'tools'}),F('rpm','Devir (rpm)','number'),F('feed_mm_min','İlerleme (mm/dk)','number'),F('depth_mm','Paso derinliği (mm)','number'),F('stepover_pct','Stepover (%)','number'),F('outcome','Deneme sonucu / yüzey kalitesi'),F('verified','Kayıt doğrulandı mı?','boolean',{default:0}),F('notes','Notlar','textarea')]}
};
const quoteFields=[F('customer_id','Müşteri','ref',{entity:'customers'}),F('order_id','İlişkili sipariş','ref',{entity:'orders'}),F('material_id','Malzeme','ref',{entity:'materials'}),F('machine_id','Makine','ref',{entity:'machines'}),F('title','Teklif adı'),F('quantity','Adet','number',{default:1}),F('blank_x_mm','Malzeme eni (mm)','number'),F('blank_y_mm','Malzeme boyu (mm)','number'),F('blank_z_mm','Kalınlık (mm)','number'),F('density_g_cm3','Yoğunluk (g/cm³)','number'),F('price_try_kg','Malzeme alış fiyatı (TL/kg)','number'),F('machine_eur_hour','CNC saatlik fiyatı (EUR)','number',{default:50}),F('eur_try','EUR/TRY kuru (elle)','number'),F('cut_minutes_per_unit','Birim kesim süresi (dk)','number'),F('setup_minutes','Bağlama / hazırlık (dk)','number',{default:0}),F('waste_pct','Malzeme fire payı (%)','number',{default:10}),F('markup_pct','Maliyet üzerine eklenen oran (%)','number',{default:25}),F('notes','Özel notlar','textarea')];
const columns={id:'#',name:'Ad',code:'Kod',spindle_kw:'kW',max_rpm:'rpm',hourly_eur:'€/saat',diameter_mm:'Çap',flutes:'Ağız',type:'Tür',verified:'Doğrulandı',density_g_cm3:'Yoğunluk',price_try_kg:'TL/kg',stock_kg:'Stok kg',phone:'Telefon',email:'E-posta',customer_id:'Müşteri',material_id:'Malzeme',tool_id:'Takım',machine_id:'Makine',title:'Açıklama',quantity:'Adet',status:'Durum',due_date:'Teslim',rpm:'rpm',feed_mm_min:'mm/dk',outcome:'Sonuç'};
const cache={};let current='overview';let editing=null;
async function request(route, options={}) {
  const res=await fetch(route,{credentials:'same-origin',headers:{'Content-Type':'application/json'},...options});
  const data=await res.json();
  if (!res.ok) throw new Error(data.error || 'Bağlantı hatası');
  return data;
}
function node(tag,text,attrs={}){const el=document.createElement(tag);if(text!=null)el.textContent=String(text);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);return el;}
function showLogin(value){$('login').hidden=!value;$('workspace').hidden=value;$('logout').hidden=value;}
function report(id,msg,failed=false){const el=$(id);el.textContent=msg;el.className='notice'+(failed?' error':'');}
function fieldNode(f,old={}) {
  const label=node('label',f.label);
  let input;
  if(f.type==='ref' || f.type==='boolean' || f.type==='status'){
    input=node('select');
    const options=f.type==='boolean'?[['0','Hayır / onaysız'],['1','Evet / onaylı']]:f.type==='status'?Object.entries(STATUSES):[['','Seçiniz'],...(cache[f.entity]||[]).map(r=>[String(r.id),r.name||r.title||('#'+r.id)])];
    for(const [v,t] of options){const option=node('option',t);option.value=v;input.append(option);}
  }else if(f.type==='textarea'){input=node('textarea');}else{input=node('input');input.type=f.type==='number'?'number':f.type;}
  input.name=f.key;input.id='field-'+f.key+'-'+Math.random().toString(36).slice(2,8);
  if(f.type==='number'){input.step='any';input.min='0';if(f.key==='quantity'||f.key==='flutes'||f.key==='rpm')input.step='1';}
  let val=old[f.key]??f.default??'';
  input.value=String(val);
  label.append(input);
  return label;
}
function formData(form) {
  const data={};
  for(const [k,v] of new FormData(form).entries()) if(v!=='') data[k]=v;
  return data;
}
async function loadReferences(){for(const entity of ['machines','tools','materials','customers','orders']){if (!cache[entity])cache[entity]=(await request('/api/ops/'+entity)).items;}}
function renderFields(container,schema,old){container.replaceChildren(...schema.map(f=>fieldNode(f,old)));}
function table(thead,tbody,rows,fields,edit=false){
  thead.replaceChildren();tbody.replaceChildren();const header=node('tr');
  for(const f of fields)header.append(node('th',columns[f]||f));if(edit)header.append(node('th','Düzenle'));thead.append(header);
  for(const r of rows){const tr=node('tr');
    for(const f of fields){let value=r[f]??'—';if(f==='verified')value=r[f]?'Evet':'Hayır';if(f==='status')value=STATUSES[value]||value;
      if(f.endsWith('_id')){const entity=f.replace('_id','')+'s';const x=(cache[entity]||[]).find(x=>x.id===r[f]);if(x)value=x.name||x.title||value;}
      tr.append(node('td',value));}
    if(edit){const td=node('td');const button=node('button','Düzenle');button.type='button';button.addEventListener('click',()=>startEdit(r));td.append(button);tr.append(td);}
    tbody.append(tr);
  }
}
async function loadOverview(){const d=await request('/api/ops/overview');const labels={machines:'Makine',tools:'Freze',materials:'Malzeme',customers:'Müşteri',orders:'Sipariş',trials:'Deneme',quotes:'Teklif'};
  $('kpis').replaceChildren(...Object.entries(labels).map(([k,label])=>{const div=node('div',null,{class:'kpi'});div.append(node('span',label),node('b',d.counts[k]));return div;}));}
async function loadList(entity) {const res=await request('/api/ops/'+entity);cache[entity]=res.items;
  $('sectionTitle').textContent=sections[entity].name;$('sectionDesc').textContent=sections[entity].desc;
  table($('thead'),$('tbody'),res.items,sections[entity].cols,true);}
function startEdit(row){editing=row.id;renderFields($('fields'),sections[current].fields,row);$('formTitle').textContent=`#${row.id} kaydını düzenle`;$('cancelEdit').hidden=false;$('save').textContent='Değişiklikleri kaydet';window.scrollTo({top:$('formBox').getBoundingClientRect().top+window.scrollY-90,behavior:'smooth'});}
function resetEdit(){editing=null;$('formTitle').textContent='Yeni kayıt';$('cancelEdit').hidden=true;$('save').textContent='Kaydet';renderFields($('fields'),sections[current].fields,{});}
async function loadQuotes(){const r=await request('/api/ops/quotes');table($('quotesHead'),$('quotesBody'),r.items,['id','title','quantity','offer_total_try','created_at']);}
async function activate(entity){current=entity;editing=null;for(const c of $('tabs').children)c.classList.toggle('active',c.dataset.entity===entity);
  $('overview').hidden=entity!=='overview';$('editor').hidden=!sections[entity];$('quotes').hidden=entity!=='quotes';
  try{await loadReferences();if(entity==='overview')await loadOverview();else if(entity==='quotes'){
    renderFields($('quoteFields'),quoteFields,{});wireQuotePrefill();await loadQuotes();}
    else{resetEdit();await loadList(entity);}
  }catch(e){report('message',e.message,true);}}
function wireQuotePrefill() {
  const find=k=>$('quoteFields').querySelector(`[name="${k}"]`);
  const m=find('material_id');const machine=find('machine_id');
  m?.addEventListener('change',()=>{const r=(cache.materials||[]).find(x=>String(x.id)===m.value);if(!r)return;for(const [from,to] of [['density_g_cm3','density_g_cm3'],['price_try_kg','price_try_kg']])if(r[from]!=null)find(to).value=r[from];});
  machine?.addEventListener('change',()=>{const r=(cache.machines||[]).find(x=>String(x.id)===machine.value);if(r?.hourly_eur!=null)find('machine_eur_hour').value=r.hourly_eur;});
}
async function init(){const status=await request('/api/status');showLogin(!status.authenticated);if(!status.authenticated)return;
  $('tabs').replaceChildren(...[['overview','Genel bakış'],['machines','Makineler'],['tools','Frezeler'],['materials','Malzemeler'],['trials','Denemeler'],['customers','Müşteriler'],['orders','Siparişler'],['quotes','Teklifler']].map(([key,label])=>{
  const b=node('button',label);b.dataset.entity=key;b.type='button';b.addEventListener('click',()=>activate(key));return b;}));
  await activate('overview');}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginError').textContent='';try{await request('/api/login',{method:'POST',body:JSON.stringify({password:$('password').value})});$('password').value='';await init();}catch(e){$('loginError').textContent=e.message;}});
$('logout').addEventListener('click',async()=>{await request('/api/logout',{method:'POST'});showLogin(true);});
$('reload').addEventListener('click',()=>loadList(current).catch(e=>report('message',e.message,true)));
$('cancelEdit').addEventListener('click',resetEdit);
$('recordForm').addEventListener('submit',async e=>{e.preventDefault();report('message','');try{const values=formData(e.target);const wasEdit=editing!==null;const route='/api/ops/'+current+(wasEdit?'/'+editing:'');await request(route,{method:wasEdit?'PATCH':'POST',body:JSON.stringify(values)});report('message',wasEdit?'Kayıt güncellendi':'Kayıt eklendi');await loadList(current);resetEdit();}catch(e){report('message',e.message,true);}});
$('quoteForm').addEventListener('submit',async e=>{e.preventDefault();report('quoteMessage','');try{const v=formData(e.target);const r=await request('/api/ops/quotes',{method:'POST',body:JSON.stringify(v)});const q=r.item;const metrics=[['Malzeme ağırlığı',fmt(q.material_kg)+' kg'],['Malzeme + fire',money(q.material_total_try)],['Makine + hazırlık',money(q.machine_total_try)],['Direkt maliyet',money(q.direct_total_try)],['KDV hariç teklif',money(q.offer_total_try)],['Kâr için eklenen oran',fmt(q.markup_pct)+' %']];$('quoteResult').hidden=false;$('quoteResult').replaceChildren(...metrics.map(([k,v])=>{const d=node('div');d.append(node('span',k),node('b',v));return d;}));report('quoteMessage','Teklif #'+q.id+' kaydedildi. Fiyatı onaylamadan önce diğer giderleri kontrol edin.');await loadQuotes();}catch(e){report('quoteMessage',e.message,true);}});

$('previewQuote').addEventListener('click',async()=>{
  report('quoteMessage','');
  try {
    const values=formData($('quoteForm'));
    const response=await request('/api/ops/quote-preview',{method:'POST',body:JSON.stringify(values)});
    const q=response.quote;
    const metrics=[['Malzeme ağırlığı',fmt(q.material_kg)+' kg'],['Malzeme + fire',money(q.material_total_try)],['Makine + hazırlık',money(q.machine_total_try)],['Direkt maliyet',money(q.direct_total_try)],['KDV hariç teklif',money(q.offer_total_try)],['Kâr için eklenen oran',fmt(q.markup_pct)+' %']];
    $('quoteResult').hidden=false;
    $('quoteResult').replaceChildren(...metrics.map(([k,v])=>{const d=node('div');d.append(node('span',k),node('b',v));return d;}));
    report('quoteMessage','Önizleme hesaplandı. Müşteri teklifi olarak kaydedilmedi.');
  } catch(e) { report('quoteMessage',e.message,true); }
});
init().catch(e=>{$('login').hidden=false;$('loginError').textContent='Sunucuya bağlanılamadı: '+e.message;});
