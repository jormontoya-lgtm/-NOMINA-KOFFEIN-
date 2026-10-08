// ===== Utilidades =====
const $ = id => document.getElementById(id);
const LV = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (e) { return d; } };
const SV = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const m = n => '$' + (Number(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const tiempo = k => { const v = localStorage.getItem(k); if (!v) return 0; return isNaN(v) ? (Date.parse(v) || 0) : Number(v); };

// ===== Empleados (recupera lista anterior si tenía otro nombre) =====
let emps = LV('kof_emp', null);
if (!emps) {
  for (const k of ['kof_emps', 'kof_empleados', 'empleados', 'emps']) {
    const v = LV(k, null);
    if (Array.isArray(v) && v.length) { emps = v; break; }
  }
  emps = emps || [];
  SV('kof_emp', emps);
}

// ===== Semana =====
function kofSemanaISO(f) {
  const d = new Date(f + 'T12:00:00');
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const s = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - s) / 864e5 - 3 + ((s.getDay() + 6) % 7)) / 7);
}

function kofNombreArchivo() {
  const ini = $('ini').value, fin = $('fin').value;
  if (!ini) return 'Koffein_' + new Date().toISOString().slice(0, 10) + '.xlsx';
  return `Koffein_Semana${kofSemanaISO(ini)}_${ini}_a_${fin || ini}.xlsx`;
}

function pintarSemana() {
  const ini = $('ini').value, fin = $('fin').value;
  const n = ini ? kofSemanaISO(ini) : '';
  $('semana').dataset.n = n;
  $('semana').textContent = n ? `Semana ${n}` : 'Elige la fecha de inicio';
  SV('kof_fechas', { ini, fin });
  calcular();
}

// ===== Pintar empleados =====
function pintarEmpleados() {
  $('emps').innerHTML = emps.map((e, i) => `
  <div class="emp">
    <input data-i="${i}" data-k="nombre" value="${e.nombre || ''}" placeholder="Nombre">
    <label>Salario diario ($)<input data-i="${i}" data-k="salario" type="number" inputmode="decimal" value="${e.salario || 0}"></label>
    <label>Días trabajados<input data-i="${i}" data-k="dias" type="number" inputmode="decimal" value="${e.dias || 0}"></label>
    <label>Horas extra<input data-i="${i}" data-k="extras" type="number" inputmode="decimal" value="${e.extras || 0}"></label>
    <label class="chk"><input data-i="${i}" data-k="activo" type="checkbox" ${e.activo !== false ? 'checked' : ''}> Activo esta semana</label>
    <button class="del" data-del="${i}">Eliminar</button>
  </div>`).join('');
}

function cambioEmpleado(ev) {
  const t = ev.target, i = t.dataset.i, k = t.dataset.k;
  if (i === undefined || !k) return;
  emps[i][k] = t.type === 'checkbox' ? t.checked : (t.type === 'number' ? (parseFloat(t.value) || 0) : t.value);
  SV('kof_emp', emps);
  calcular();
}

// ===== Cálculo y recibos =====
const N = v => parseFloat(String(v ?? '').replace(',', '.')) || 0;

function calcular() {
  const tot = N($('prop').value);
  SV('kof_prop', tot);
  const act = emps.filter(e => e.activo !== false && e.activo !== 'false');
  const jor = e => N(e.dias) + N(e.extras) / 8;
  const jt = act.reduce((s, e) => s + jor(e), 0);

  const res = act.map(e => {
    const dias = N(e.dias), extras = N(e.extras), sal = N(e.salario);
    const sueldo = sal * dias;
    const extra = extras * (sal / 8) * 2;
    const propina = jt ? tot * jor(e) / jt : 0;
    return { nombre: e.nombre || 'Sin nombre', dias, extras, sueldo, extra, propina, total: sueldo + extra + propina };
  });

  // Resumen de totales
  const S = k => res.reduce((s, e) => s + e[k], 0);
  $('resumen').innerHTML = res.length ? `
  <div class="card">
    <h2>Percepciones semanales totales</h2>
    <table>
      <tr><td><b>Empleado</b></td><td><b>Salario</b></td><td><b>Propinas</b></td><td><b>Total</b></td></tr>
      ${res.map(e => `<tr><td>${e.nombre}</td><td>${m(e.sueldo + e.extra)}</td><td>${m(e.propina)}</td><td>${m(e.total)}</td></tr>`).join('')}
    </table>
    <table style="margin-top:10px">
      <tr><td>Sueldos</td><td>${m(S('sueldo'))}</td></tr>
      <tr><td>Horas extra</td><td>${m(S('extra'))}</td></tr>
      <tr><td>Propinas repartidas</td><td>${m(S('propina'))}</td></tr>
      <tr class="tot"><td>Total a pagar</td><td>${m(S('total'))}</td></tr>
    </table>
  </div>` : '';

  const sem = $('semana').dataset.n || '';
  $('recibos').innerHTML = res.map(e => `
  <div class="card">
    <h3>${e.nombre}</h3>
    <table>
      <tr><td>Sueldo (${e.dias} días)</td><td>${m(e.sueldo)}</td></tr>
      <tr><td>Horas extra (${e.extras} h)</td><td>${m(e.extra)}</td></tr>
      <tr><td>Propinas</td><td>${m(e.propina)}</td></tr>
      <tr class="tot"><td>Total</td><td>${m(e.total)}</td></tr>
    </table>
    <div class="ley" style="color:#333"><b style="color:#333">Declaración de conformidad</b><br>
      Recibí de conformidad la cantidad arriba indicada por concepto de sueldo, horas extra y propinas
      correspondientes a la semana ${sem}, sin que se me adeude cantidad alguna por estos conceptos.
        <div class="firma">Firma:<br>
        <canvas class="pad" width="600" height="200" data-k="firma_${sem}_${e.nombre}"></canvas>
        <button class="no-print borrar" type="button">Borrar firma</button>
      </div>

    </div>
  </div>`).join('');
    document.querySelectorAll('.pad').forEach(firmaPad);

  return res;
}

// ===== Firma digital =====
function firmaPad(c) {
  const x = c.getContext('2d'), k = c.dataset.k;
  x.lineWidth = 3; x.lineCap = 'round'; x.strokeStyle = '#000';
  const g = localStorage.getItem(k);
  if (g) { const i = new Image(); i.onload = () => x.drawImage(i, 0, 0, c.width, c.height); i.src = g; }
  let d = false;
  const p = ev => { const r = c.getBoundingClientRect();
    return [(ev.clientX - r.left) * c.width / r.width, (ev.clientY - r.top) * c.height / r.height]; };
  c.onpointerdown = ev => { d = true; c.setPointerCapture(ev.pointerId); const [a, b] = p(ev); x.beginPath(); x.moveTo(a, b); };
  c.onpointermove = ev => { if (!d) return; const [a, b] = p(ev); x.lineTo(a, b); x.stroke(); };
  c.onpointerup = c.onpointercancel = () => { if (!d) return; d = false; localStorage.setItem(k, c.toDataURL()); };
  c.nextElementSibling.onclick = () => { x.clearRect(0, 0, c.width, c.height); localStorage.removeItem(k); };
}


// ===== Guardar semana =====
function guardarSemana() {
  const ini = $('ini').value, fin = $('fin').value;
  if (!ini || !fin) { alert('Pon la fecha de inicio y fin de la semana'); return; }
  const h = LV('kof_hist', []);
  const reg = { semana: kofSemanaISO(ini), ini, fin, propinas: parseFloat($('prop').value) || 0, recibos: calcular() };
  const i = h.findIndex(x => x.ini === ini);
  if (i >= 0) h[i] = reg; else h.push(reg);
  SV('kof_hist', h);
  localStorage.setItem('kof_ultimoGuardado', String(Date.now()));
  kofRevisarAviso();
  if (confirm('Semana guardada ✅\n¿Quieres exportar el Excel ahora?')) exportarLibro();
}

// ===== Exportar Excel =====
function exportarLibro() {
  if (typeof XLSX === 'undefined') { alert('No se pudo cargar el exportador. Revisa tu conexión a internet.'); return; }
  const wb = XLSX.utils.book_new();
  const r2 = n => Math.round((Number(n) || 0) * 100) / 100;

  const actual = calcular().map(e => ({
    Empleado: e.nombre, Dias: e.dias, 'Horas extra': e.extras,
    Sueldo: r2(e.sueldo), 'Pago extra': r2(e.extra), Propinas: r2(e.propina), Total: r2(e.total)
  }));
  const nSem = $('semana').dataset.n || 'Actual';
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(actual.length ? actual : [{ Empleado: 'Sin empleados' }]), ('Semana ' + nSem).slice(0, 31));

  const filas = [];
  LV('kof_hist', []).forEach(s => (s.recibos || []).forEach(e => filas.push({
    Semana: s.semana, Inicio: s.ini, Fin: s.fin, Empleado: e.nombre, Dias: e.dias, 'Horas extra': e.extras,
    Sueldo: r2(e.sueldo), 'Pago extra': r2(e.extra), Propinas: r2(e.propina), Total: r2(e.total)
  })));
  if (filas.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas), 'Historial');

  XLSX.writeFile(wb, kofNombreArchivo());
  localStorage.setItem('kof_ultimaExportacion', String(Date.now()));
  kofRevisarAviso();
}

// ===== Barra amarilla =====
function kofRevisarAviso() {
  const pend = tiempo('kof_ultimoGuardado') > tiempo('kof_ultimaExportacion');
  const a = $('aviso');
  a.textContent = '⚠️ Tienes semanas guardadas sin exportar. Toca aquí para exportar.';
  a.style.display = pend ? 'block' : 'none';
}

// ===== Eventos =====
$('ini').addEventListener('change', () => {
  const ini = $('ini').value;
  if (ini) {
    const d = new Date(ini + 'T12:00:00');
    d.setDate(d.getDate() + 6);
    $('fin').value = d.toISOString().slice(0, 10);
  }
  pintarSemana();
});
$('fin').addEventListener('change', pintarSemana);
$('prop').addEventListener('input', calcular);
$('emps').addEventListener('input', cambioEmpleado);
$('emps').addEventListener('change', cambioEmpleado);
$('emps').addEventListener('click', ev => {
  const i = ev.target.dataset.del;
  if (i === undefined) return;
  if (confirm('¿Eliminar a ' + (emps[i].nombre || 'este empleado') + '?')) {
    emps.splice(i, 1); SV('kof_emp', emps); pintarEmpleados(); calcular();
  }
});
$('btnAdd').addEventListener('click', () => {
  emps.push({ nombre: '', salario: 0, dias: 0, extras: 0, activo: true });
  SV('kof_emp', emps); pintarEmpleados(); calcular();
});
$('btnGuardar').addEventListener('click', guardarSemana);
$('btnExportar').addEventListener('click', exportarLibro);
$('aviso').addEventListener('click', exportarLibro);

// ===== Imprimir / PDF =====
(function () {
  let b = document.getElementById('btnPrint');
  if (!b) {
    b = document.createElement('button');
    b.id = 'btnPrint';
    b.textContent = 'Imprimir / PDF';
    document.querySelector('.botones').appendChild(b);
  }
  b.onclick = function () {
    try { calcular(); } catch (e) { alert('Error al calcular: ' + e.message); }
    setTimeout(function () { window.print(); }, 300);
  };
})();

// ===== Inicio =====
const f0 = LV('kof_fechas', {});
$('ini').value = f0.ini || '';
$('fin').value = f0.fin || '';
$('prop').value = LV('kof_prop', 0);
pintarEmpleados();
pintarSemana();
kofRevisarAviso();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
// ===== Evitar que la página se mueva al firmar =====
document.addEventListener('touchmove', function (e) {
  if (e.target && e.target.tagName === 'CANVAS') e.preventDefault();
}, { passive: false });

document.addEventListener('touchstart', function (e) {
  if (e.target && e.target.tagName === 'CANVAS') e.preventDefault();
}, { passive: false });

