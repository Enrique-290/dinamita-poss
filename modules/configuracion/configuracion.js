(function(){
  const $ = (id)=>document.getElementById(id);

  const elLogo = $("cfg-logo");
  const elLogoPreview = $("cfg-logoPreview");
  const elLogoClear = $("cfg-logoClear");

  const elName = $("cfg-name");
  const elAddress = $("cfg-address");
  const elPhone = $("cfg-phone");
  const elEmail = $("cfg-email");
  const elSocial = $("cfg-social");

  const elBg = $("cfg-bg");
  const elPanel = $("cfg-panel");
  const elPrimary = $("cfg-primary");
  const elText = $("cfg-text");

  const elIva = $("cfg-iva");
  const elMessage = $("cfg-message");
  const elUserName = $("cfg-userName");
  const elUserUsername = $("cfg-userUsername");
  const elUserPassword = $("cfg-userPassword");
  const elUserRole = $("cfg-userRole");
  const elUsersList = $("cfg-usersList");
  let editingUserId = "";

  function cfg(){ return dpGetConfig(); }

  function applyBusinessUi(){
    try{ dpRenderBranding(); }catch(e){}
    try{ document.dispatchEvent(new CustomEvent("dp:branding-updated")); }catch(e){}
  }

  function setLogoPreview(dataUrl){
    if(dataUrl){
      elLogoPreview.src = dataUrl;
      elLogoPreview.style.display = "block";
    }else{
      elLogoPreview.src = "";
      elLogoPreview.style.display = "none";
    }
  }


  async function fitLogoForTicket(file){
    const dataUrl = await readFileAsDataUrl(file);
    const img = await loadImage(dataUrl);

    const MAX_W = 420;
    const MAX_H = 180;
    const ratio = Math.min(MAX_W / img.width, MAX_H / img.height, 1);
    const targetW = Math.max(1, Math.round(img.width * ratio));
    const targetH = Math.max(1, Math.round(img.height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = MAX_W;
    canvas.height = MAX_H;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const x = Math.round((MAX_W - targetW) / 2);
    const y = Math.round((MAX_H - targetH) / 2);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, x, y, targetW, targetH);

    return canvas.toDataURL("image/png");
  }

  function readFileAsDataUrl(file){
    return new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onload = ()=> resolve(String(reader.result || ""));
      reader.onerror = ()=> reject(new Error("No se pudo leer la imagen."));
      reader.readAsDataURL(file);
    });
  }

  function loadImage(src){
    return new Promise((resolve, reject)=>{
      const img = new Image();
      img.onload = ()=> resolve(img);
      img.onerror = ()=> reject(new Error("No se pudo procesar la imagen."));
      img.src = src;
    });
  }


  function resetUserForm(){
    editingUserId = '';
    if(elUserName) elUserName.value = '';
    if(elUserUsername) elUserUsername.value = '';
    if(elUserPassword) elUserPassword.value = '';
    if(elUserRole) elUserRole.value = 'empleado';
  }

  function renderUsers(){
    if(!elUsersList) return;
    const users = (typeof dpGetUsers === 'function') ? dpGetUsers() : [];
    elUsersList.innerHTML = users.map(u=>`
      <div class="cfgUserItem">
        <div class="cfgUserMeta">
          <div class="cfgUserName">${u.name || ''}</div>
          <div class="cfgUserSub">${u.username || ''} · ${u.role || ''} · ${u.active===false ? 'Inactivo' : 'Activo'}</div>
        </div>
        <div class="cfgUserActions">
          <button class="btn btn--ghost" type="button" data-edit-user="${u.id}">Editar</button>
          <button class="btn btn--ghost" type="button" data-toggle-user="${u.id}">${u.active===false ? 'Activar' : 'Desactivar'}</button>
          ${String(u.username||'').toLowerCase() === 'admin' ? '' : `<button class="btn btn--ghost" type="button" data-delete-user="${u.id}">Eliminar</button>`}
        </div>
      </div>
    `).join('');

    elUsersList.querySelectorAll('[data-edit-user]').forEach(btn=>btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-edit-user');
      const user = users.find(x=>x.id===id);
      if(!user) return;
      editingUserId = user.id;
      elUserName.value = user.name || '';
      elUserUsername.value = user.username || '';
      elUserPassword.value = user.password || '';
      elUserRole.value = user.role || 'empleado';
    }));

    elUsersList.querySelectorAll('[data-toggle-user]').forEach(btn=>btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-toggle-user');
      const user = users.find(x=>x.id===id);
      if(!user) return;
      try{
        dpSetUserActive(id, user.active===false);
        renderUsers();
      }catch(err){ alert(err.message || 'No se pudo cambiar el estado.'); }
    }));

    elUsersList.querySelectorAll('[data-delete-user]').forEach(btn=>btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-delete-user');
      if(!confirm('¿Eliminar este usuario?')) return;
      try{
        dpDeleteUser(id);
        if(editingUserId===id) resetUserForm();
        renderUsers();
      }catch(err){ alert(err.message || 'No se pudo eliminar.'); }
    }));
  }

  function fill(){
    const c = cfg();
    const b = c.business || {};
    const a = c.appearance || {};
    const t = c.ticket || {};

    elName.value = b.name || "";
    elAddress.value = b.address || "";
    elPhone.value = b.phone || "";
    elEmail.value = b.email || "";
    elSocial.value = b.social || "";
    setLogoPreview(b.logoDataUrl || "");

    elBg.value = a.bg || "#ffffff";
    elPanel.value = a.panel || "#ffffff";
    elPrimary.value = a.primary || "#c00000";
    elText.value = a.text || "#111111";

    elIva.value = Number(t.ivaDefault ?? 0);
    elMessage.value = t.message || "Gracias por tu compra en Dinamita Gym 💥";
  }

  // Business save/reset
  $("cfg-saveBusiness").addEventListener("click", ()=>{
    const c = cfg();
    dpSetConfig({
      business: {
        ...c.business,
        name: elName.value.trim() || "Dinamita Gym",
        address: elAddress.value.trim(),
        phone: elPhone.value.trim(),
        email: elEmail.value.trim(),
        social: elSocial.value.trim(),
      }
    });
    applyBusinessUi();
    alert("Guardado ✅");
  });

  $("cfg-resetBusiness").addEventListener("click", ()=>{
    dpSetConfig({
      business: { logoDataUrl:"", name:"Dinamita Gym", address:"", phone:"", email:"", social:"" }
    });
    fill();
    applyBusinessUi();
    alert("Restablecido ✅");
  });

  // Logo upload
  elLogo.addEventListener("change", async ()=>{
    const file = elLogo.files && elLogo.files[0];
    if(!file) return;
    try{
      const dataUrl = await fitLogoForTicket(file);
      dpSetConfig({ business: { logoDataUrl: dataUrl } });
      setLogoPreview(dataUrl);
      applyBusinessUi();
      alert("Logo guardado y ajustado al ticket ✅");
    }catch(err){
      console.error(err);
      alert("No se pudo procesar el logo.");
    }
  });

  elLogoClear.addEventListener("click", ()=>{
    dpSetConfig({ business: { logoDataUrl:"" } });
    setLogoPreview("");
    applyBusinessUi();
  });

  // Appearance save/reset
  $("cfg-saveAppearance").addEventListener("click", ()=>{
    dpSetConfig({
      appearance: {
        bg: elBg.value,
        panel: elPanel.value,
        primary: elPrimary.value,
        text: elText.value
      }
    });
    try{ dpApplyTheme(); }catch(e){}
    alert("Apariencia guardada ✅");
  });

  $("cfg-resetAppearance").addEventListener("click", ()=>{
    dpSetConfig({
      appearance: { bg:"#ffffff", panel:"#ffffff", primary:"#c00000", text:"#111111" }
    });
    fill();
    try{ dpApplyTheme(); }catch(e){}
    alert("Apariencia restablecida ✅");
  });

  document.querySelectorAll("[data-palette]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const name = btn.getAttribute("data-palette");
      const palettes = {
        dinamita: { bg:"#ffffff", panel:"#ffffff", primary:"#c00000", text:"#111111" },
        claro:    { bg:"#ffffff", panel:"#ffffff", primary:"#d50000", text:"#111111" },
        oscuro:   { bg:"#141414", panel:"#1f1f1f", primary:"#c00000", text:"#ffffff" },
      };
      const p = palettes[name] || palettes.dinamita;
      elBg.value = p.bg; elPanel.value = p.panel; elPrimary.value = p.primary; elText.value = p.text;
      dpSetConfig({ appearance: p });
      try{ dpApplyTheme(); }catch(e){}
    });
  });

  // Ticket save/reset
  $("cfg-saveTicket").addEventListener("click", ()=>{
    dpSetConfig({
      ticket: {
        ivaDefault: Number(elIva.value||0),
        message: elMessage.value.trim() || "Gracias por tu compra en Dinamita Gym 💥"
      }
    });
    alert("Ticket guardado ✅");
  });

  $("cfg-resetTicket").addEventListener("click", ()=>{
    dpSetConfig({ ticket: { ivaDefault:0, message:"Gracias por tu compra en Dinamita Gym 💥" } });
    fill();
    alert("Restablecido ✅");
  });


  // Respaldo (Exportar / Importar)
  const elExportBackup = $("cfg-exportBackup");
  const elImportBackup = $("cfg-importBackup");
  const elImportFile   = $("cfg-importFile");
  const elBackupStatus = $("cfg-backupStatus");

  function setBackupStatus(msg){
    if(!elBackupStatus) return;
    elBackupStatus.textContent = msg || "";
  }

  function downloadTextFile(filename, text, mime="application/json"){
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 800);
  }

  if(elExportBackup){
    elExportBackup.addEventListener("click", ()=>{
      try{
        const st = dpGetState();
        const d = new Date();
        const pad = (n)=>String(n).padStart(2,"0");
        const ts = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
        const filename = `dinamita_pos_respaldo_${ts}.json`;
        downloadTextFile(filename, JSON.stringify(st, null, 2));
        setBackupStatus("Respaldo exportado ✅");
      }catch(err){
        console.error(err);
        setBackupStatus("Error al exportar respaldo ❌");
        alert("No se pudo exportar el respaldo.");
      }
    });
  }

  if(elImportBackup && elImportFile){
    elImportBackup.addEventListener("click", ()=>{
      elImportFile.value = "";
      elImportFile.click();
    });

    elImportFile.addEventListener("change", async ()=>{
      const file = elImportFile.files && elImportFile.files[0];
      if(!file) return;

      try{
        setBackupStatus("Importando respaldo...");
        const text = await file.text();
        const data = JSON.parse(text);

        // Validación básica
        if(!data || typeof data !== "object" || !("products" in data) || !("sales" in data) || !("clients" in data)){
          alert("Este archivo no parece un respaldo válido de Dinamita POS.");
          setBackupStatus("Archivo inválido ❌");
          return;
        }

        dpSetState(()=>data);
        setBackupStatus("Respaldo importado ✅ Reiniciando...");
        // Recargar para que todos los módulos tomen el nuevo estado
        setTimeout(()=>window.location.reload(), 450);
      }catch(err){
        console.error(err);
        setBackupStatus("Error al importar ❌");
        alert("No se pudo importar el respaldo. Verifica que sea un JSON válido.");
      }
    });
  }


  if($("cfg-saveUser")){
    $("cfg-saveUser").addEventListener("click", ()=>{
      const name = elUserName.value.trim();
      const username = elUserUsername.value.trim().toLowerCase();
      const password = elUserPassword.value.trim();
      const role = elUserRole.value || 'empleado';
      if(!name || !username || !password){ alert('Completa nombre, usuario y contraseña.'); return; }
      const users = (typeof dpGetUsers === 'function') ? dpGetUsers() : [];
      const taken = users.find(x=>String(x.username||'').toLowerCase()===username && x.id!==editingUserId);
      if(taken){ alert('Ese usuario ya existe.'); return; }
      dpSaveUser({ id: editingUserId || undefined, name, username, password, role, active:true });
      resetUserForm();
      renderUsers();
      alert('Usuario guardado ✅');
    });
  }

  if($("cfg-resetUser")){
    $("cfg-resetUser").addEventListener("click", resetUserForm);
  }

  // Init
  try{ dpApplyTheme(); }catch(e){}
  fill();
  applyBusinessUi();
  renderUsers();
})();
