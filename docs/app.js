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
XLSX.writeFile(libro, kofNombreArchivo());
localStorage.setItem('kof_ultimaExportacion', Date.now());

render();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
function totales(){const a=act();
$('#tsal').value=m(a.reduce((s,e)=>s+(e.sueldo||0),0));
$('#thx').value=m(a.reduce((s,e)=>s+(e.extra||0),0));}
const _calc=calc;calc=function(){_calc();totales();};
$('#prop').addEventListener('input',totales);
totales();

/* Días con decimales */
function decimales(){document.querySelectorAll('#lista input[type=number]').forEach(i=>{i.step='any';i.inputMode='decimal';});}
new MutationObserver(decimales).observe($('#lista'),{childList:true,subtree:true});decimales();

/* Recordar nombres de la semana pasada */
function campoNombre(c){return c.querySelector('input[type=text],input:not([type])');}
function guardarNombres(){const n=[...$('#lista').children].map(campoNombre).filter(Boolean).map(i=>i.value.trim()).filter(Boolean);
if(n.length)localStorage.setItem('kf_nombres',JSON.stringify(n));}
$('#save').addEventListener('click',guardarNombres);
$('#lista').addEventListener('change',guardarNombres);
(function cargarNombres(){const n=JSON.parse(localStorage.getItem('kf_nombres')||'[]');
n.forEach((nom,k)=>{let c=$('#lista').children;if(!c[k])$('#add').click();c=$('#lista').children;
const i=c[k]&&campoNombre(c[k]);if(i&&!i.value){i.value=nom;i.dispatchEvent(new Event('input',{bubbles:true}));}});})();

/* ===== Exportación Koffein: un libro con una hoja por mes ===== */
(function () {
  const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  // Lee una fecha "AAAA-MM-DD" sin que se recorra un día por la zona horaria
  function aFecha(v) {
    if (!v) return null;
    const s = String(v);
    const d = /^\d{4}-\d{2}-\d{2}/.test(s) ? new Date(s.slice(0, 10) + "T12:00:00") : new Date(s);
    return isNaN(d) ? null : d;
  }

  // Número de semana del año (ISO: la semana empieza en lunes)
  function numSemana(fecha) {
    const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
    const dia = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dia);
    const inicioAnio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - inicioAnio) / 86400000 + 1) / 7);
  }

  // Encuentra la lista de empleados dentro de una semana guardada
  function empleadosDe(sem) {
    if (!sem || typeof sem !== "object") return [];
    for (const v of Object.values(sem)) {
      if (Array.isArray(v) && v.length && typeof v[0] === "object" && "nombre" in v[0]) return v;
    }
    return [];
  }

  function fechaDe(sem, clave) {
    return aFecha(sem.ini || sem.inicio || sem.desde || sem.fecha || sem.semana || sem.start || clave);
  }

  // Busca el historial de semanas en la memoria de la app
  function buscarHistorial() {
    let mejor = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k === "kof_emp" || k === "kof_prop") continue;
      let d;
      try { d = JSON.parse(localStorage.getItem(k)); } catch (e) { continue; }
      if (!d || typeof d !== "object") continue;
      const lista = Array.isArray(d)
        ? d.map(s => ({ s, clave: null }))
        : Object.entries(d).map(([clave, s]) => ({ s, clave }));
      const validas = lista.filter(x => empleadosDe(x.s).length && fechaDe(x.s, x.clave));
      if (validas.length > mejor.length) mejor = validas;
    }
    return mejor;
  }

  const num = v => Number(v) || 0;

  function exportarLibro() {
    if (typeof XLSX === "undefined") { alert("No se cargó la librería de Excel. Revisa tu conexión."); return; }
    const hist = buscarHistorial();
    if (!hist.length) { alert("No encontré semanas guardadas para exportar."); return; }

    // Agrupa las semanas por mes según la fecha de inicio
    const porMes = {};
    hist.forEach(x => {
      const d = fechaDe(x.s, x.clave);
      const clave = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      (porMes[clave] = porMes[clave] || []).push({ d, s: x.s });
    });

    const wb = XLSX.utils.book_new();
    const fmt = d => d ? d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) : "";

    Object.keys(porMes).sort().forEach(clave => {
      const semanas = porMes[clave].sort((a, b) => a.d - b.d);
      const filas = [["No. semana", "Semana", "Empleado", "Días", "Horas extra", "Sueldo", "Horas extras ($)", "Propinas", "Total a pagar"]];
      const resumen = {};
      const T = [0, 0, 0, 0];

      semanas.forEach(x => {
        const fin = aFecha(x.s.fin || x.s.hasta || x.s.end);
        const etiqueta = fmt(x.d) + (fin ? " – " + fmt(fin) : "");
        const noSem = "Sem " + numSemana(x.d);
        empleadosDe(x.s).filter(e => e.activo !== false).forEach(e => {
          const sueldo = num(e.sueldo), extra = num(e.extra), prop = num(e.propina);
          const tot = num(e.total) || sueldo + extra + prop;
          filas.push([noSem, etiqueta, e.nombre, num(e.dias), num(e.hx), sueldo, extra, prop, tot]);
          T[0] += sueldo; T[1] += extra; T[2] += prop; T[3] += tot;
          const r = resumen[e.nombre] = resumen[e.nombre] || [0, 0, 0, 0, 0, 0];
          r[0] += num(e.dias); r[1] += num(e.hx); r[2] += sueldo; r[3] += extra; r[4] += prop; r[5] += tot;
        });
      });

      filas.push(["TOTAL DEL MES", "", "", "", "", ...T]);
      filas.push([]);
      filas.push(["RESUMEN POR EMPLEADO", "", "", "Días", "Horas extra", "Sueldo", "Horas extras ($)", "Propinas", "Total a pagar"]);
      Object.entries(resumen).forEach(([n, r]) => filas.push(["", "", n, ...r]));

      const ws = XLSX.utils.aoa_to_sheet(filas);
      ws["!cols"] = [{ wch: 11 }, { wch: 18 }, { wch: 22 }, { wch: 7 }, { wch: 11 }, { wch: 13 }, { wch: 16 }, { wch: 13 }, { wch: 15 }];

      // Formato de moneda en las columnas de dinero
      const rango = XLSX.utils.decode_range(ws["!ref"]);
      for (let R = 1; R <= rango.e.r; R++) {
        for (let C = 5; C <= 8; C++) {
          const c = ws[XLSX.utils.encode_cell({ r: R, c: C })];
          if (c && typeof c.v === "number") c.z = '"$"#,##0.00';
        }
      }

      const [y, mm] = clave.split("-");
      XLSX.utils.book_append_sheet(wb, ws, (MESES[+mm - 1] + " " + y).slice(0, 31));
    });

    XLSX.writeFile(wb, "Nomina_Koffein.xlsx");
  }

  window.exportarLibro = exportarLibro;

  // El botón de Excel que ya tienes usará esta exportación
  document.addEventListener("click", ev => {
    const b = ev.target.closest("button, a");
    if (b && /excel/i.test(b.textContent)) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      exportarLibro();
    }
  }, true);
})();
/* ===== Número de semana en pantalla ===== */
(function () {
  function numSemana(fecha) {
    const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
    const dia = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dia);
    const inicioAnio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - inicioAnio) / 86400000 + 1) / 7);
  }

  let ultimo = null;
  function actualizar() {
    const ini = document.getElementById("ini");
    const out = document.getElementById("nosem");
    if (!ini || !out) return;
    if (ini.value === ultimo) return;
    ultimo = ini.value;
    if (!ini.value) { out.value = ""; return; }
    const f = new Date(ini.value + "T12:00:00");
    out.value = isNaN(f) ? "" : "Semana " + numSemana(f);
  }

  document.addEventListener("input", e => { if (e.target.id === "ini") actualizar(); });
  document.addEventListener("change", e => { if (e.target.id === "ini") actualizar(); });
  window.addEventListener("load", actualizar);
  // Por si la app llena la fecha sola (al cargar o abrir una semana guardada)
  setInterval(actualizar, 800);
})();
// ===== Nombre de archivo con semana y fecha =====
function kofSemanaISO(fecha) {
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const dia = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dia);
  const inicioAnio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - inicioAnio) / 86400000 + 1) / 7);
}

function kofNombreArchivo() {
  const hoy = new Date();
  const fecha = hoy.getFullYear() + '-' +
    String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
    String(hoy.getDate()).padStart(2, '0');
  const semana = String(kofSemanaISO(hoy)).padStart(2, '0');
  return 'Nomina_Koffein_Sem' + semana + '_' + fecha + '.xlsx';
}



