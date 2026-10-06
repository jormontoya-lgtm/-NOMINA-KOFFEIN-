const $=s=>document.querySelector(s);
const LS=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}};
const SV=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const m=n=>'$'+(+n||0).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=s=>String(s).replace(/"/g,'&quot;').replace(/</g,'&lt;');
const LEY='Recibí de Koffein la cantidad señalada en este recibo por concepto de salario, horas extras y propinas correspondientes al periodo indicado, manifestando mi conformidad y que no se me adeuda cantidad alguna por dicho periodo. Documento que sirve como constancia de pago conforme al Art. 804 de la Ley Federal del Trabajo.';

let emp=LS('kof_emp',null);
if(!emp){emp=[];for(let i=1;i<=7;i++)emp.push({id:Date.now()+i,nombre:'Empleado '+i,sal:0,dias:6,hx:0,activo:true});SV('kof_emp',emp);}
const act=()=>emp.filter(e=>e.activo);

(function(){const d=new Date(),w=(d.getDay()+6)%7;d.setDate(d.getDate()-w);
const f=x=>x.toISOString().slice(0,10);$('#ini').value=f(d);d.setDate(d.getDate()+6);$('#fin').value=f(d);
$('#prop').value=localStorage.getItem('kof_prop')||0;})();

function calc(){
const P=+$('#prop').value||0;localStorage.setItem('kof_prop',P);
const jt=act().reduce((s,e)=>s+(+e.dias||0)+(+e.hx||0)/8,0);
act().forEach(e=>{
const sal=+e.sal||0,d=+e.dias||0,h=+e.hx||0,j=d+h/8;
e.sueldo=sal*d;e.extra=sal/8*2*h;e.propina=jt?P*j/jt:0;e.total=e.sueldo+e.extra+e.propina;
const t=document.getElementById('r'+e.id);
if(t)t.innerHTML=`<tr><td>Sueldo ordinario (${d} días)</td><td>${m(e.sueldo)}</td></tr>
<tr><td>Horas extras (${h} h, pago doble)</td><td>${m(e.extra)}</td></tr>
<tr><td>Propinas (${j.toFixed(2)} jornadas)</td><td>${m(e.propina)}</td></tr>
<tr class="tot"><td>TOTAL A PAGAR</td><td>${m(e.total)}</td></tr>`;});
SV('kof_emp',emp);}

function firma(c){const x=c.getContext('2d');x.lineWidth=3;x.lineCap='round';x.strokeStyle='#2b1a10';let d=false;
const p=ev=>{const r=c.getBoundingClientRect();return[(ev.clientX-r.left)*c.width/r.width,(ev.clientY-r.top)*c.height/r.height]};
c.addEventListener('pointerdown',ev=>{d=true;c.setPointerCapture(ev.pointerId);x.beginPath();x.moveTo(...p(ev))});
c.addEventListener('pointermove',ev=>{if(d){x.lineTo(...p(ev));x.stroke()}});
c.addEventListener('pointerup',()=>d=false);}

function render(){
$('#lista').innerHTML=act().map(e=>`<div class="card">
<div class="top"><input class="nom" value="${esc(e.nombre)}" data-id="${e.id}" data-k="nombre"><button class="baja" data-id="${e.id}">Baja</button></div>
<div class="grid">
<label>Salario diario<input type="number" inputmode="decimal" value="${e.sal}" data-id="${e.id}" data-k="sal"></label>
<label>Días trab.<input type="number" inputmode="numeric" value="${e.dias}" data-id="${e.id}" data-k="dias"></label>
<label>Horas extras<input type="number" inputmode="decimal" value="${e.hx}" data-id="${e.id}" data-k="hx"></label>
</div>
<table class="t" id="r${e.id}"></table>
<canvas id="f${e.id}" width="600" height="160"></canvas>
<div class="lf"><span>Firma del empleado</span><button class="lim" data-id="${e.id}">Borrar firma</button></div>
<div class="ley"><b>Declaración de Conformidad Laboral (Art. 804 LFT México)</b><br>${LEY}</div>
</div>`).join('');
act().forEach(e=>firma(document.getElementById('f'+e.id)));calc();}

$('#lista').addEventListener('input',ev=>{const t=ev.target,id=t.dataset.id;if(!id)return;
emp.find(x=>x.id==id)[t.dataset.k]=t.value;calc();});
$('#lista').addEventListener('click',ev=>{const t=ev.target,id=t.dataset.id;if(!id)return;
if(t.classList.contains('baja')&&confirm('¿Dar de baja a este empleado? Su historial se conserva.')){emp.find(x=>x.id==id).activo=false;SV('kof_emp',emp);render();}
if(t.classList.contains('lim')){const c=document.getElementById('f'+id);c.getContext('2d').clearRect(0,0,c.width,c.height);}});
$('#prop').addEventListener('input',calc);
$('#add').onclick=()=>{emp.push({id:Date.now(),nombre:'Nuevo empleado',sal:0,dias:6,hx:0,activo:true});render();};

$('#save').onclick=()=>{const ini=$('#ini').value;if(!ini)return alert('Indica la fecha de inicio');calc();
const h=LS('kof_hist',[]).filter(w=>w.ini!==ini);
h.push({ini,fin:$('#fin').value,rows:act().map(e=>({id:e.id,nombre:e.nombre,total:e.total}))});
SV('kof_hist',h);alert('Semana guardada ✅');};

$('#xls').onclick=()=>{const mes=$('#ini').value.slice(0,7);
const sem=LS('kof_hist',[]).filter(w=>w.ini.slice(0,7)===mes).sort((a,b)=>a.ini<b.ini?-1:1);
if(!sem.length)return alert('No hay semanas guardadas en este mes');
if(typeof XLSX==='undefined')return alert('Se necesita internet para exportar Excel');
const ids=[],nom={};sem.forEach(w=>w.rows.forEach(r=>{if(!ids.includes(r.id))ids.push(r.id);nom[r.id]=r.nombre}));
const data=[['Empleado',...sem.map(w=>w.ini+' a '+w.fin),'Total mes']];
ids.forEach(id=>{let t=0;const row=[nom[id]];sem.forEach(w=>{const r=w.rows.find(x=>x.id==id);const v=r?Math.round(r.total*100)/100:0;t+=v;row.push(v)});row.push(Math.round(t*100)/100);data.push(row)});
const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(data),'Nomina');
XLSX.writeFile(wb,'Nomina_Koffein_'+mes+'.xlsx');};

render();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
function totales(){const a=act();
$('#tsal').value=m(a.reduce((s,e)=>s+(e.sueldo||0),0));
$('#thx').value=m(a.reduce((s,e)=>s+(e.extra||0),0));}
const _calc=calc;calc=function(){_calc();totales();};
$('#prop').addEventListener('input',totales);
totales();

