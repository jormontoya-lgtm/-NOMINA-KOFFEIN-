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
function calcular() {
  const tot = parseFloat($('prop').value) || 0;
  SV('kof_prop', tot);
  const act = emps.filter(e => e.activo !== false);
  const jt = act.reduce((s, e) => s + (e.dias || 0) + (e.extras || 0) / 8, 0);

  const res = act.map(e => {
    const j = (e.dias || 0) + (e.extras || 0) / 8;
    const sueldo = (e.salario || 0) * (e.dias || 0);
    const extra = (e.extras || 0) * ((e.salario || 0) / 8) * 2;
    const propina = jt ? tot * j / jt : 0;
    return { nombre: e.nombre || 'Sin nombre', dias: e.dias || 0, extras: e.extras || 0, sueldo, extra, propina, total: sueldo + extra + propina };
  });

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
      <div class="firma">Firma: ______________________</div>
    </div>
  </div>`).join('');
  return res;
}

// ===== Guardar semana =====
function guardarSemana() {
  const ini = $('ini').value, fin = $('fin').value;
  if (!ini || !fin) { alert('Pon la fecha de inicio y fin de la semana'); return; }
  const h = LV('kof_hist', []);
  const reg = { semana: kofSemanaISO(ini), ini, fin, propinas: parseFloat($('prop').value) || 0, recibos: calcular() };
  const i = h.findIndex(x
