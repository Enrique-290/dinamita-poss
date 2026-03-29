(function(){
  const $ = (id)=>document.getElementById(id);
  const state = typeof dpGetState==='function' ? dpGetState() : {};
  const biz = typeof dpGetBizInfo==='function' ? dpGetBizInfo() : {name:'Dinamita Gym', phone:'', address:''};
  const defaultData = {
    general:{
      title:'Explota tu potencial',
      subtitle:'Nueva base modular para Página 2.0 dentro de Dinamita POS.',
      trust:'Atención personalizada, catálogo ordenado y base lista para crecer.'
    },
    banners:{heroText:'Promo principal', secondaryText:'Promo secundaria'},
    catalogo:{limit:120},
    categorias:[],
    promociones:['2x1 en membresías','Creatina + shaker','Promoción de la semana'],
    contacto:{whatsapp:'',phone:biz.phone||'',address:biz.address||''}
  };

  function getCfg(){
    const st = typeof dpGetState==='function' ? dpGetState() : {};
    const cur = st?.config?.website2 || {};
    return {
      ...defaultData,
      ...cur,
      general:{...defaultData.general,...(cur.general||{})},
      banners:{...defaultData.banners,...(cur.banners||{})},
      catalogo:{...defaultData.catalogo,...(cur.catalogo||{})},
      promociones:Array.isArray(cur.promociones)&&cur.promociones.length?cur.promociones.slice(0,3):defaultData.promociones.slice(),
      contacto:{...defaultData.contacto,...(cur.contacto||{})}
    };
  }

  let page2 = getCfg();

  function saveCfg(){
    if(typeof dpSetState!=='function') return;
    dpSetState(st=>{
      st.config = st.config || {};
      st.config.website2 = JSON.parse(JSON.stringify(page2));
      return st;
    });
  }

  function detectCategories(){
    const products = Array.isArray(state?.products) ? state.products : [];
    return Array.from(new Set(products.map(p=>String(p?.category || p?.brand || 'Producto').trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'es'));
  }

  function bindTabs(){
    document.querySelectorAll('#pg2-tabs .pg2__tab').forEach(btn=>{
      btn.addEventListener('click',()=>{
        document.querySelectorAll('#pg2-tabs .pg2__tab').forEach(x=>x.classList.toggle('active', x===btn));
        document.querySelectorAll('.pg2__panel').forEach(p=>p.classList.toggle('active', p.dataset.panel===btn.dataset.tab));
      });
    });
  }

  function fillForm(){
    $('pg2-title').value = page2.general.title || '';
    $('pg2-subtitle').value = page2.general.subtitle || '';
    $('pg2-trust').value = page2.general.trust || '';
    $('pg2-heroText').value = page2.banners.heroText || '';
    $('pg2-secondaryText').value = page2.banners.secondaryText || '';
    $('pg2-promo1').value = page2.promociones[0] || '';
    $('pg2-promo2').value = page2.promociones[1] || '';
    $('pg2-promo3').value = page2.promociones[2] || '';
    $('pg2-whatsapp').value = page2.contacto.whatsapp || '';
    $('pg2-phone').value = page2.contacto.phone || '';
    $('pg2-address').value = page2.contacto.address || '';
    const cats = detectCategories();
    $('pg2-productsCount').textContent = String((Array.isArray(state?.products)?state.products.length:0));
    $('pg2-categories').innerHTML = cats.length ? cats.map(c=>`<span class="pg2__chip">${c}</span>`).join('') : '<span class="muted">Sin categorías detectadas.</span>';
  }

  function readForm(){
    page2.general.title = $('pg2-title').value.trim();
    page2.general.subtitle = $('pg2-subtitle').value.trim();
    page2.general.trust = $('pg2-trust').value.trim();
    page2.banners.heroText = $('pg2-heroText').value.trim();
    page2.banners.secondaryText = $('pg2-secondaryText').value.trim();
    page2.promociones = [$('pg2-promo1').value.trim(), $('pg2-promo2').value.trim(), $('pg2-promo3').value.trim()].filter(Boolean);
    page2.contacto.whatsapp = $('pg2-whatsapp').value.trim();
    page2.contacto.phone = $('pg2-phone').value.trim();
    page2.contacto.address = $('pg2-address').value.trim();
    page2.categorias = detectCategories();
  }

  function renderPreview(){
    const preview = $('pg2-preview');
    if(!preview) return;
    const cats = detectCategories();
    const products = (Array.isArray(state?.products)?state.products:[]).slice(0,6);
    preview.innerHTML = `
      <section class="pg2Block pg2Hero">
        <small>Página 2.0 · Home modular</small>
        <h1>${page2.general.title || 'Explota tu potencial'}</h1>
        <div>${page2.general.subtitle || ''}</div>
        <div><strong>${page2.banners.heroText || 'Promo principal'}</strong> · ${page2.banners.secondaryText || 'Promo secundaria'}</div>
      </section>
      <section class="pg2Block">
        <h3>Categorías</h3>
        <div class="pg2__chips">${cats.length ? cats.map(c=>`<span class="pg2__chip">${c}</span>`).join('') : '<span class="muted">Sin categorías todavía.</span>'}</div>
      </section>
      <section class="pg2Block">
        <h3>Catálogo base</h3>
        <div class="pg2Grid">${products.map(p=>`<article class="pg2Item"><strong>${p.name||'Producto'}</strong><div>${p.category||p.brand||'Categoría'}</div><div>${typeof dpFmtMoney==='function'?dpFmtMoney(p.price||0):('$'+(p.price||0))}</div></article>`).join('') || '<div class="muted">No hay productos cargados.</div>'}</div>
      </section>
      <section class="pg2Block">
        <h3>Promociones</h3>
        <div class="pg2Grid">${(page2.promociones||[]).map(x=>`<article class="pg2Item"><strong>${x}</strong><div>Bloque listo para promo visual.</div></article>`).join('') || '<div class="muted">Sin promociones configuradas.</div>'}</div>
      </section>
      <section class="pg2Block pg2Foot">
        <h3>Contacto</h3>
        <div><strong>WhatsApp:</strong> ${page2.contacto.whatsapp || 'Pendiente'}</div>
        <div><strong>Teléfono:</strong> ${page2.contacto.phone || 'Pendiente'}</div>
        <div><strong>Dirección:</strong> ${page2.contacto.address || 'Pendiente'}</div>
        <div>${page2.general.trust || ''}</div>
      </section>`;
  }

  function bindInputs(){
    ['pg2-title','pg2-subtitle','pg2-trust','pg2-heroText','pg2-secondaryText','pg2-promo1','pg2-promo2','pg2-promo3','pg2-whatsapp','pg2-phone','pg2-address'].forEach(id=>{
      const el=$(id); if(!el) return;
      el.addEventListener('input', ()=>{ readForm(); renderPreview(); });
    });
    $('pg2-save')?.addEventListener('click', ()=>{ readForm(); saveCfg(); alert('Base modular de Página 2.0 guardada.'); });
    $('pg2-reset')?.addEventListener('click', ()=>{ page2 = JSON.parse(JSON.stringify(defaultData)); fillForm(); renderPreview(); saveCfg(); });
  }

  bindTabs();
  fillForm();
  bindInputs();
  renderPreview();
})();