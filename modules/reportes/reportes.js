/* Reportes - Dinamita POS v0
   - Usa dpGetSalesRows para consistencia (desglosado por producto/concepto)
   - General / Productos / Categoría / Membresías
   - Export CSV (Excel) y PDF (impresión)
*/
(function(){
  const $ = (id)=>document.getElementById(id);

  const rType = $("r-type");
  const rFrom = $("r-from");
  const rTo = $("r-to");
  const rCategory = $("r-category");
  const rApply = $("r-apply");
  const rReset = $("r-reset");
  const rExportCsv = $("r-exportCsv");
  const rExportPdf = $("r-exportPdf");

  const rStats = $("r-stats");
  const rTitle = $("r-title");
  const rSubtitle = $("r-subtitle");
  const rThead = $("r-thead");
  const rTbody = $("r-tbody");
  const rEmpty = $("r-empty");
  const rSide = $("r-side");

  let currentRows = [];

  function state(){ return dpGetState(); }
  function fmtMoney(n){ return dpFmtMoney ? dpFmtMoney(n) : ("$"+Number(n||0).toFixed(2)); }

  function getClientName(clientId){
    const st = state();
    const c = (st.clients||[]).find(x=>x.id===clientId);
    if(c) return c.name;
    if(clientId==="GEN") return "Cliente General";
    return clientId || "Cliente";
  }

  function uniq(arr){ return Array.from(new Set(arr)); }

  function sanitizeLabel(s){
    return String(s||"")
      .replaceAll("dÃ­as","días")
      .replaceAll("piÃ±a","piña")
      .replaceAll("higenico","higiénico")
      .trim();
  }

  function productFamily(name, category=""){
    const n = sanitizeLabel(name).toLowerCase();
    const c = sanitizeLabel(category).toLowerCase();
    const map = [
      ["bonafont","Bonafont"],
      ["gatorade","Gatorade"],
      ["volt","Volt"],
      ["electrolit","Electrolit"],
      ["monster","Monster"],
      ["psychotic","Psychotic"],
      ["deli barras","Deli barras"],
      ["delai barras","Deli barras"],
      ["barras muscle sandwich","Barras Muscle Sandwich"],
      ["toma de","Tomas"],
      ["cafe","Café"],
      ["toalla","Toallas"],
      ["toallas","Toallas"]
    ];
    for(const [k,v] of map){ if(n.startsWith(k)) return v; }
    if(c && c !== 'sin categoría' && c !== 'membresías' && c !== 'servicios') return sanitizeLabel(category);
    const firstTwo = sanitizeLabel(name).split(/\s+/).slice(0,2).join(' ').trim();
    const first = sanitizeLabel(name).split(/\s+/)[0] || 'Productos';
    return firstTwo.length <= 18 ? firstTwo : first;
  }

  function buildOperationalData(rows){
    const memberships = new Map();
    const families = new Map();
    let membershipTotal = 0, productsTotal = 0;
    for(const r of rows){
      if(r.kind === 'membresia'){
        const key = sanitizeLabel(r.product);
        if(!memberships.has(key)) memberships.set(key, {name:key, qty:0, total:0});
        const item = memberships.get(key);
        item.qty += Number(r.qty||0);
        item.total += Number(r.total||0);
        membershipTotal += Number(r.total||0);
      }else if(r.kind === 'venta'){
        const fam = productFamily(r.product, r.category);
        if(!families.has(fam)) families.set(fam, new Map());
        const byProduct = families.get(fam);
        const key = sanitizeLabel(r.product);
        if(!byProduct.has(key)) byProduct.set(key, {name:key, qty:0, total:0});
        const item = byProduct.get(key);
        item.qty += Number(r.qty||0);
        item.total += Number(r.total||0);
        productsTotal += Number(r.total||0);
      }
    }
    const membershipList = Array.from(memberships.values()).sort((a,b)=>a.name.localeCompare(b.name));
    const familyList = Array.from(families.entries()).map(([family, map])=>{
      const items = Array.from(map.values()).sort((a,b)=>a.name.localeCompare(b.name));
      const subtotal = items.reduce((a,b)=>a+Number(b.total||0),0);
      return { family, items, subtotal };
    }).sort((a,b)=>b.subtotal-a.subtotal || a.family.localeCompare(b.family));
    return { membershipList, familyList, membershipTotal, productsTotal, grandTotal: membershipTotal + productsTotal };
  }

  function loadCategories(){
    const st = state();
    const cats = uniq((st.products||[]).map(p=>p.category).filter(Boolean)).sort((a,b)=>a.localeCompare(b));
    rCategory.innerHTML = "";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "Todas las categorías";
    rCategory.appendChild(opt0);
    cats.forEach(c=>{
      const o = document.createElement("option");
      o.value = c;
      o.textContent = c;
      rCategory.appendChild(o);
    });
  }

  function setStats(rows){
    const total = rows.reduce((a,b)=>a+Number(b.total||0),0);
    const ventas = rows.filter(r=>r.kind==="venta").reduce((a,b)=>a+Number(b.total||0),0);
    const memb = rows.filter(r=>r.kind==="membresia").reduce((a,b)=>a+Number(b.total||0),0);
    const serv = rows.filter(r=>r.kind==="servicio").reduce((a,b)=>a+Number(b.total||0),0);

    rStats.innerHTML = `
      <div class="rstat"><div class="k">Registros</div><div class="v">${rows.length}</div></div>
      <div class="rstat"><div class="k">Ventas (productos)</div><div class="v">${fmtMoney(ventas)}</div></div>
      <div class="rstat"><div class="k">Membresías</div><div class="v">${fmtMoney(memb)}</div></div>
      <div class="rstat"><div class="k">Servicios</div><div class="v">${fmtMoney(serv)}</div></div>
      <div class="rstat"><div class="k">Total</div><div class="v">${fmtMoney(total)}</div></div>
    `;

    rSide.innerHTML = `
      <div class="sbox">
        <div class="t">Totales por tipo</div>
        <div class="m">
          <span class="pill">Ventas: ${fmtMoney(ventas)}</span>
          <span class="pill">Membresías: ${fmtMoney(memb)}</span>
          <span class="pill">Servicios: ${fmtMoney(serv)}</span>
          <span class="pill">TOTAL: ${fmtMoney(total)}</span>
        </div>
      </div>
      <div class="sbox">
        <div class="t">Rango</div>
        <div class="m">
          <span class="pill">Desde: ${rFrom.value || "—"}</span>
          <span class="pill">Hasta: ${rTo.value || "—"}</span>
        </div>
      </div>
    `;
  }

  function setTable(headers, rows, rowFn){
    rThead.innerHTML = `<tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr>`;
    rTbody.innerHTML = rows.map(rowFn).join("");
    rEmpty.style.display = rows.length ? "none" : "block";
  }

  function render(){
    const type = rType.value;
    const from = rFrom.value || "";
    const to = rTo.value || "";
    const cat = rCategory.value || "";

    const all = dpGetSalesRows({from, to});
    currentRows = all.slice();

    // Apply category filter only to relevant views
    if(cat){
      currentRows = currentRows.filter(r => (r.category||"") === cat);
    }

    if(type === "operativo"){
      rTitle.textContent = "Super reporte operativo";
      rSubtitle.textContent = "Resumen tipo Excel: membresías, productos por bloques y total general.";
      const op = buildOperationalData(currentRows);
      rStats.innerHTML = `
        <div class="rstat"><div class="k">Bloques producto</div><div class="v">${op.familyList.length}</div></div>
        <div class="rstat"><div class="k">Membresías</div><div class="v">${fmtMoney(op.membershipTotal)}</div></div>
        <div class="rstat"><div class="k">Productos</div><div class="v">${fmtMoney(op.productsTotal)}</div></div>
        <div class="rstat"><div class="k">Total general</div><div class="v">${fmtMoney(op.grandTotal)}</div></div>
      `;
      const rowsHtml = [];
      if(op.membershipList.length){
        rowsHtml.push(`<tr class="repSection"><td colspan="3">Membresías</td></tr>`);
        op.membershipList.forEach(it=>{
          rowsHtml.push(`
            <tr>
              <td>${it.name}</td>
              <td class="right">${it.qty}</td>
              <td class="right"><strong>${fmtMoney(it.total)}</strong></td>
            </tr>`);
        });
        rowsHtml.push(`<tr class="repSubtotal"><td><strong>Total membresías</strong></td><td></td><td class="right"><strong>${fmtMoney(op.membershipTotal)}</strong></td></tr>`);
      }
      op.familyList.forEach(f=>{
        rowsHtml.push(`<tr class="repSection"><td colspan="3">${f.family}</td></tr>`);
        f.items.forEach(it=>{
          rowsHtml.push(`
            <tr>
              <td>${it.name}</td>
              <td class="right">${it.qty}</td>
              <td class="right"><strong>${fmtMoney(it.total)}</strong></td>
            </tr>`);
        });
        rowsHtml.push(`<tr class="repSubtotal"><td><strong>Total ${f.family}</strong></td><td></td><td class="right"><strong>${fmtMoney(f.subtotal)}</strong></td></tr>`);
      });
      rowsHtml.push(`<tr class="repGrand"><td><strong>Total general</strong></td><td></td><td class="right"><strong>${fmtMoney(op.grandTotal)}</strong></td></tr>`);
      rThead.innerHTML = `<tr><th>Concepto</th><th class="right">Piezas</th><th class="right">Total</th></tr>`;
      rTbody.innerHTML = rowsHtml.join('');
      rEmpty.style.display = rowsHtml.length ? 'none' : 'block';
      rSide.innerHTML = `
        <div class="sbox"><div class="t">Resumen operativo</div><div class="m">
          <span class="pill">Membresías: ${fmtMoney(op.membershipTotal)}</span>
          <span class="pill">Productos: ${fmtMoney(op.productsTotal)}</span>
          <span class="pill">Bloques: ${op.familyList.length}</span>
          <span class="pill">TOTAL: ${fmtMoney(op.grandTotal)}</span>
        </div></div>
        <div class="sbox"><div class="t">Rango</div><div class="m">
          <span class="pill">Desde: ${rFrom.value || "—"}</span>
          <span class="pill">Hasta: ${rTo.value || "—"}</span>
        </div></div>`;
      return;
    }

    if(type === "cortes"){
      rTitle.textContent = "Cortes de caja";
      rSubtitle.textContent = "Aperturas y cierres de caja por usuario.";
      const cuts = ((typeof dpGetCashSessions === "function") ? dpGetCashSessions() : []).filter(c=>{
        const date = String(c.openedAt||"").slice(0,10);
        if(from && date < from) return false;
        if(to && date > to) return false;
        return true;
      });
      const cutsOpen = cuts.filter(c=>c.status==='open').length;
      const cutsClosed = cuts.filter(c=>c.status==='closed').length;
      const cutsTotal = cuts.reduce((a,b)=>a+Number(b?.totals?.total||0),0);
      const cutsCashExpected = cuts.reduce((a,b)=>a+Number(b?.expectedCash||0),0);
      const cutsDiff = cuts.reduce((a,b)=>a+Number(b?.difference||0),0);
      const cutsCash = cuts.reduce((a,b)=>a+Number(b?.totals?.byPayment?.efectivo||0),0);
      const cutsCard = cuts.reduce((a,b)=>a+Number(b?.totals?.byPayment?.tarjeta||0),0);
      const cutsTransfer = cuts.reduce((a,b)=>a+Number(b?.totals?.byPayment?.transferencia||0),0);
      rStats.innerHTML = `
        <div class="rstat"><div class="k">Cortes</div><div class="v">${cuts.length}</div></div>
        <div class="rstat"><div class="k">Abiertas</div><div class="v">${cutsOpen}</div></div>
        <div class="rstat"><div class="k">Cerradas</div><div class="v">${cutsClosed}</div></div>
        <div class="rstat"><div class="k">Venta total</div><div class="v">${fmtMoney(cutsTotal)}</div></div>
        <div class="rstat"><div class="k">Diferencia acumulada</div><div class="v">${fmtMoney(cutsDiff)}</div></div>
      `;
      setTable(
        ["Usuario","Apertura","Cierre","Fondo","Efectivo","Tarjeta","Transferencia","Ventas","Esperado","Contado","Diferencia","Estado"],
        cuts,
        c => `
          <tr>
            <td>${c.userName||""}</td>
            <td>${c.openedAt||""}</td>
            <td>${c.closedAt||""}</td>
            <td class="right">${fmtMoney(c.openingAmount||0)}</td>
            <td class="right">${fmtMoney(c?.totals?.byPayment?.efectivo||0)}</td>
            <td class="right">${fmtMoney(c?.totals?.byPayment?.tarjeta||0)}</td>
            <td class="right">${fmtMoney(c?.totals?.byPayment?.transferencia||0)}</td>
            <td class="right">${fmtMoney(c?.totals?.total||0)}</td>
            <td class="right">${fmtMoney(c.expectedCash||0)}</td>
            <td class="right">${c.closingAmount==null?"—":fmtMoney(c.closingAmount)}</td>
            <td class="right"><strong>${c.closingAmount==null?"—":fmtMoney(c.difference||0)}</strong></td>
            <td>${c.status==="open"?"Abierta":"Cerrada"}</td>
          </tr>
        `
      );
      rSide.innerHTML = `
        <div class="sbox"><div class="t">Resumen de cortes</div><div class="m">
          <span class="pill">Abiertas: ${cutsOpen}</span>
          <span class="pill">Cerradas: ${cutsClosed}</span>
          <span class="pill">Ventas: ${fmtMoney(cutsTotal)}</span>
          <span class="pill">Efectivo: ${fmtMoney(cutsCash)}</span>
          <span class="pill">Tarjeta: ${fmtMoney(cutsCard)}</span>
          <span class="pill">Transferencia: ${fmtMoney(cutsTransfer)}</span>
          <span class="pill">Esperado: ${fmtMoney(cutsCashExpected)}</span>
          <span class="pill">Diferencia: ${fmtMoney(cutsDiff)}</span>
        </div></div>
        <div class="sbox"><div class="t">Rango</div><div class="m">
          <span class="pill">Desde: ${rFrom.value || "—"}</span>
          <span class="pill">Hasta: ${rTo.value || "—"}</span>
        </div></div>`;
      return;
    }

    setStats(currentRows);

    if(type === "general"){
      rTitle.textContent = "Resumen general";
      rSubtitle.textContent = "Totales por ticket (sin inconsistencias).";
      const byTicket = {};
      for(const r of currentRows){
        const key = r.ticket;
        if(!byTicket[key]){
          byTicket[key] = { ticket:r.ticket, date:r.date, kind:r.kind, client:getClientName(r.clientId), pay:(r.paymentMethod||""), total:0 };
        }
        byTicket[key].total += Number(r.total||0);
        if(r.kind!=="venta" && byTicket[key].kind==="venta") byTicket[key].kind = r.kind;
      }
      const list = Object.values(byTicket).sort((a,b)=> (b.date||"").localeCompare(a.date||"") || (b.ticket||"").localeCompare(a.ticket||""));
      setTable(
        ["Fecha","Ticket","Tipo","Cliente","Pago","Total"],
        list,
        x => `
          <tr>
            <td>${x.date||""}</td>
            <td><strong>${x.ticket}</strong></td>
            <td>${x.kind==="venta"?"Venta":(x.kind==="membresia"?"Membresía":"Servicio")}</td>
            <td>${x.client}</td>
            <td>${x.pay || ""}</td>
            <td class="right"><strong>${fmtMoney(x.total)}</strong></td>
          </tr>
        `
      );
      return;
    }

    if(type === "productos"){
      rTitle.textContent = "Desglose por producto";
      rSubtitle.textContent = "Fecha, ticket, producto, precio unitario, piezas, total.";
      const rows = currentRows.filter(r=>r.kind==="venta");
      setTable(
        ["Fecha","Ticket","Cliente","Pago","Producto","Categoría","Precio U.","Pzs","Total"],
        rows,
        r => `
          <tr>
            <td>${r.date}</td>
            <td>${r.ticket}</td>
            <td>${getClientName(r.clientId)}</td>
            <td>${r.paymentMethod||""}</td>
            <td>${r.product}</td>
            <td>${r.category||""}</td>
            <td class="right">${fmtMoney(r.unitPrice)}</td>
            <td class="right">${Number(r.qty||0)}</td>
            <td class="right"><strong>${fmtMoney(r.total)}</strong></td>
          </tr>
        `
      );
      return;
    }

    if(type === "categoria"){
      rTitle.textContent = "Por categoría";
      rSubtitle.textContent = "Totales agrupados por categoría.";
      const map = {};
      for(const r of currentRows.filter(r=>r.kind==="venta")){
        const c = r.category || "Sin categoría";
        if(!map[c]) map[c] = { category:c, qty:0, total:0 };
        map[c].qty += Number(r.qty||0);
        map[c].total += Number(r.total||0);
      }
      const list = Object.values(map).sort((a,b)=>b.total-a.total);
      setTable(
        ["Categoría","Pzs","Total"],
        list,
        x => `
          <tr>
            <td><strong>${x.category}</strong></td>
            <td class="right">${x.qty}</td>
            <td class="right"><strong>${fmtMoney(x.total)}</strong></td>
          </tr>
        `
      );
      return;
    }

    if(type === "membresias"){
      rTitle.textContent = "Membresías";
      rSubtitle.textContent = "Desglose de cobros de membresía (con inicio/fin si aplica).";
      const rows = currentRows.filter(r=>r.kind==="membresia");
      setTable(
        ["Fecha","Ticket","Cliente","Pago","Membresía","Inicio","Fin","Total"],
        rows,
        r => `
          <tr>
            <td>${r.date}</td>
            <td>${r.ticket}</td>
            <td>${getClientName(r.clientId)}</td>
            <td>${r.paymentMethod||""}</td>
            <td>${r.product}</td>
            <td>${r.meta?.startDate || ""}</td>
            <td>${r.meta?.endDate || ""}</td>
            <td class="right"><strong>${fmtMoney(r.total)}</strong></td>
          </tr>
        `
      );
      return;
    }
  }

  function exportCsv(){
    const type = rType.value;
    const rows = currentRows.slice();

    let headers = [];
    let data = [];

    if(type==="operativo"){
      headers = ["concepto","piezas","total"];
      const op = buildOperationalData(rows);
      data = [];
      if(op.membershipList.length){
        data.push(["Membresías","",""]);
        op.membershipList.forEach(it=>data.push([it.name,it.qty,it.total]));
        data.push(["Total membresías","",op.membershipTotal]);
      }
      op.familyList.forEach(f=>{
        data.push([f.family,"",""]);
        f.items.forEach(it=>data.push([it.name,it.qty,it.total]));
        data.push([`Total ${f.family}`,"",f.subtotal]);
      });
      data.push(["Total general","",op.grandTotal]);
    }else if(type==="cortes"){
      headers = ["usuario","apertura","cierre","fondo","efectivo","tarjeta","transferencia","ventas","esperado","contado","diferencia","estado"];
      const cuts = ((typeof dpGetCashSessions === "function") ? dpGetCashSessions() : []).filter(c=>{
        const date = String(c.openedAt||"").slice(0,10);
        if((rFrom.value||"") && date < rFrom.value) return false;
        if((rTo.value||"") && date > rTo.value) return false;
        return true;
      });
      data = cuts.map(c=>[c.userName||"",c.openedAt||"",c.closedAt||"",c.openingAmount||0,c?.totals?.byPayment?.efectivo||0,c?.totals?.byPayment?.tarjeta||0,c?.totals?.byPayment?.transferencia||0,c?.totals?.total||0,c.expectedCash||0,c.closingAmount==null?"":c.closingAmount,c.difference||0,c.status||""]);
    }else if(type==="general"){
      headers = ["fecha","ticket","tipo","cliente","pago","total"];
      const byTicket = {};
      for(const r of rows){
        const key = r.ticket;
        if(!byTicket[key]) byTicket[key] = {date:r.date,ticket:r.ticket,kind:r.kind,client:getClientName(r.clientId),total:0};
        byTicket[key].total += Number(r.total||0);
      }
      data = Object.values(byTicket).map(x=>[x.date,x.ticket,x.kind,getClientName(x.client),x.total]);
    }else if(type==="productos"){
      headers = ["fecha","ticket","cliente","pago","producto","categoria","precio_unitario","piezas","total"];
      data = rows.filter(r=>r.kind==="venta").map(r=>[r.date,r.ticket,getClientName(r.clientId),(r.paymentMethod||""),r.product,r.category,r.unitPrice,r.qty,r.total]);
    }else if(type==="categoria"){
      headers = ["categoria","piezas","total"];
      const map = {};
      for(const r of rows.filter(r=>r.kind==="venta")){
        const c = r.category || "Sin categoría";
        if(!map[c]) map[c] = {qty:0,total:0};
        map[c].qty += Number(r.qty||0);
        map[c].total += Number(r.total||0);
      }
      data = Object.entries(map).map(([c,v])=>[c,v.qty,v.total]);
    }else if(type==="membresias"){
      headers = ["fecha","ticket","cliente","pago","membresia","inicio","fin","total"];
      data = rows.filter(r=>r.kind==="membresia").map(r=>[r.date,r.ticket,getClientName(r.clientId),(r.paymentMethod||""),r.product,r.meta?.startDate||"",r.meta?.endDate||"",r.total]);
    }

    const csv = [headers.join(",")]
      .concat(data.map(row => row.map(x=>`"${String(x??"").replaceAll('"','""')}"`).join(",")))
      .join("\n");

    const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `reporte_${type}_${(window.dpYMDLocal ? window.dpYMDLocal(new Date()) : new Date().toISOString().slice(0,10))}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportPdf(){
    // Print the current table
    const title = rTitle.textContent || "Reporte";
    const sub = rSubtitle.textContent || "";
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>${title}</title>
<style>
  body{ font-family: Arial, sans-serif; padding:16px; }
  h1{ margin:0; }
  .muted{ color:#666; font-size:12px; margin-top:6px; }
  table{ width:100%; border-collapse:collapse; margin-top:12px; }
  th,td{ border:1px solid #ddd; padding:8px; font-size:12px; text-align:left; }
  th{ background:#f7f7f7; }
  .right{ text-align:right; }
</style>
</head>
<body>
  <h1>${title}</h1>
  <div class="muted">${sub}</div>
  <div class="muted">Rango: ${rFrom.value||"—"} a ${rTo.value||"—"} ${rCategory.value?(" | Categoría: "+rCategory.value):""}</div>
  ${$("r-table").outerHTML}
  <script>window.focus();</script>
</body>
</html>`;
    const w = window.open("", "_blank");
    if(!w){ alert("Tu navegador bloqueó la ventana emergente."); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  function syncUI(){
    const type = rType.value;
    const showCat = (type==="categoria" || type==="productos");
    rCategory.style.display = showCat ? "block" : "none";
  }

  // Events
  rType.addEventListener("change", ()=>{ syncUI(); render(); });
  rApply.addEventListener("click", render);
  rReset.addEventListener("click", ()=>{
    rType.value="general";
    rFrom.value="";
    rTo.value="";
    rCategory.value="";
    syncUI();
    render();
  });
  rExportCsv.addEventListener("click", exportCsv);
  rExportPdf.addEventListener("click", exportPdf);

  // Init
  if(typeof dpEnsureSeedData === "function"){ try{ dpEnsureSeedData(); }catch(e){} }
  loadCategories();
  syncUI();
  render();
})();
