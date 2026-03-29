(function(){
  const $ = (id)=>document.getElementById(id);
  const defaultBiz = typeof dpGetBizInfo==='function' ? dpGetBizInfo() : {name:'Dinamita Gym', phone:'', address:'', email:'', socials:''};
  const defaultData = {
    general:{
      businessName: defaultBiz.name || 'Dinamita Gym',
      title:'Explota tu potencial',
      subtitle:'Nueva base modular para Página 2.0 dentro de Dinamita POS.',
      trust:'Atención personalizada, catálogo ordenado y base lista para crecer.'
    },
    banners:{heroText:'Promo principal', secondaryText:'Promo secundaria'},
    catalogo:{limit:12},
    categorias:[],
    promociones:['2x1 en membresías','Creatina + shaker','Promoción de la semana'],
    contacto:{whatsapp:'',phone:defaultBiz.phone||'',address:defaultBiz.address||''}
  };

  function clone(v){ return JSON.parse(JSON.stringify(v)); }

  function normalizeProducts(raw){
    return (Array.isArray(raw)?raw:[]).map((p,idx)=>({
      id: p?.id || p?.sku || `prod-${idx+1}`,
      name: String(p?.name || 'Producto').trim(),
      price: Number(p?.price || 0),
      category: String(p?.category || p?.brand || 'General').trim() || 'General',
      stock: Number(p?.stock || 0),
      image: p?.image || p?.imageUrl || '',
      isNew: idx < 3,
      isOffer: Number(p?.price||0) > 0 && idx % 4 === 0,
      sold: Math.max(0, Number(p?.sold || p?.qtySold || 0)) || (idx===0?12:idx===1?8:idx===2?6:0)
    }));
  }

  function getState(){ return typeof dpGetState==='function' ? dpGetState() : {}; }

  function detectCategories(products){
    return Array.from(new Set(products.map(p=>p.category).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'es'));
  }

  function getCfg(){
    const st = getState();
    const cur = st?.config?.website2 || {};
    const products = normalizeProducts(st?.products);
    return {
      ...defaultData,
      ...cur,
      general:{...defaultData.general,...(cur.general||{})},
      banners:{...defaultData.banners,...(cur.banners||{})},
      catalogo:{...defaultData.catalogo,...(cur.catalogo||{})},
      promociones:Array.isArray(cur.promociones)&&cur.promociones.length?cur.promociones.slice(0,3):defaultData.promociones.slice(),
      contacto:{...defaultData.contacto,...(cur.contacto||{})},
      categorias:Array.isArray(cur.categorias)&&cur.categorias.length?cur.categorias.slice():detectCategories(products)
    };
  }

  let page2 = getCfg();

  function saveCfg(){
    if(typeof dpSetState!=='function') return;
    dpSetState(st=>{
      st.config = st.config || {};
      st.config.website2 = clone(page2);
      return st;
    });
  }

  function renderHeader(ctx){
    return `
      <section class="pg2Block pg2Header">
        <div class="pg2BrandMark">💥</div>
        <div>
          <div class="pg2BrandName">${ctx.general.businessName || 'Dinamita Gym'}</div>
          <div class="pg2BrandSub">Catálogo web modular · Página 2.0</div>
        </div>
      </section>`;
  }

  function renderHero(ctx){
    return `
      <section class="pg2Block pg2Hero">
        <small>Home modular</small>
        <h1>${ctx.general.title || 'Explota tu potencial'}</h1>
        <div class="pg2HeroText">${ctx.general.subtitle || ''}</div>
        <div class="pg2HeroPromo"><strong>${ctx.banners.heroText || 'Promo principal'}</strong> · ${ctx.banners.secondaryText || 'Promo secundaria'}</div>
        <div class="pg2HeroActions">
          <button class="btn" type="button">Entrenar ahora</button>
          <button class="btn btn--ghost" type="button">Ver catálogo</button>
        </div>
      </section>`;
  }

  function renderCategorias(ctx){
    const chips = ctx.categories.length
      ? ctx.categories.map(c=>`<button class="pg2__chipBtn" type="button">${c}</button>`).join('')
      : '<span class="muted">Sin categorías detectadas.</span>';
    return `
      <section class="pg2Block">
        <div class="pg2SectionHead"><h3>Categorías</h3><span>${ctx.categories.length} detectadas</span></div>
        <div class="pg2__chips">${chips}</div>
      </section>`;
  }

  function productCard(p, tag=''){
    const badge = tag ? `<span class="pg2CardBadge">${tag}</span>` : '';
    const img = p.image
      ? `<img src="${p.image}" alt="${p.name}" class="pg2CardImg">`
      : `<div class="pg2CardImg pg2CardImg--placeholder">${(p.name||'P').slice(0,1).toUpperCase()}</div>`;
    return `
      <article class="pg2Card">
        ${badge}
        ${img}
        <div class="pg2CardBody">
          <strong>${p.name}</strong>
          <div class="pg2CardMeta">${p.category}</div>
          <div class="pg2CardPrice">${typeof dpFmtMoney==='function' ? dpFmtMoney(p.price||0) : '$'+(p.price||0)}</div>
          <div class="pg2CardActions">
            <button class="btn btn--ghost" type="button">Detalle</button>
            <button class="btn" type="button">WhatsApp</button>
          </div>
        </div>
      </article>`;
  }

  function renderDestacados(ctx){
    const items = ctx.products.slice(0, Math.min(ctx.catalogo.limit || 12, 4));
    return `
      <section class="pg2Block">
        <div class="pg2SectionHead"><h3>Productos destacados</h3><span>${items.length} visibles</span></div>
        <div class="pg2Cards">${items.length ? items.map(p=>productCard(p,'Destacado')).join('') : '<div class="muted">No hay productos cargados.</div>'}</div>
      </section>`;
  }

  function renderCatalogo(ctx){
    const items = ctx.products.slice(0, Math.min(ctx.catalogo.limit || 12, 8));
    return `
      <section class="pg2Block">
        <div class="pg2SectionHead"><h3>Catálogo base</h3><span>${ctx.products.length} productos en TPV</span></div>
        <div class="pg2Cards">${items.length ? items.map(p=>productCard(p)).join('') : '<div class="muted">No hay productos cargados.</div>'}</div>
      </section>`;
  }

  function renderContacto(ctx){
    return `
      <section class="pg2Block pg2Foot">
        <div class="pg2SectionHead"><h3>Contacto</h3><span>Bloque modular</span></div>
        <div><strong>WhatsApp:</strong> ${ctx.contacto.whatsapp || 'Pendiente'}</div>
        <div><strong>Teléfono:</strong> ${ctx.contacto.phone || 'Pendiente'}</div>
        <div><strong>Dirección:</strong> ${ctx.contacto.address || 'Pendiente'}</div>
        <div class="pg2Trust">${ctx.general.trust || ''}</div>
      </section>`;
  }

  function renderFooter(ctx){
    return `
      <section class="pg2Block pg2FooterBlock">
        <div>Vista previa modular estable · siguiente paso: carrito y categorías reales.</div>
        <div><strong>${ctx.general.businessName || 'Dinamita Gym'}</strong></div>
      </section>`;
  }

  function renderPreview(){
    const preview = $('pg2-preview');
    if(!preview) return;
    const st = getState();
    const products = normalizeProducts(st?.products);
    const ctx = {
      ...page2,
      products,
      categories: detectCategories(products),
      catalogo: {...defaultData.catalogo, ...(page2.catalogo||{})}
    };
    preview.innerHTML = [
      renderHeader(ctx),
      renderHero(ctx),
      renderCategorias(ctx),
      renderDestacados(ctx),
      renderCatalogo(ctx),
      renderContacto(ctx),
      renderFooter(ctx)
    ].join('');
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
    $('pg2-businessName').value = page2.general.businessName || '';
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
    const products = normalizeProducts(getState()?.products);
    const cats = detectCategories(products);
    $('pg2-productsCount').textContent = String(products.length);
    $('pg2-categories').innerHTML = cats.length ? cats.map(c=>`<span class="pg2__chip">${c}</span>`).join('') : '<span class="muted">Sin categorías detectadas.</span>';
  }

  function readForm(){
    page2.general.businessName = $('pg2-businessName').value.trim() || defaultData.general.businessName;
    page2.general.title = $('pg2-title').value.trim();
    page2.general.subtitle = $('pg2-subtitle').value.trim();
    page2.general.trust = $('pg2-trust').value.trim();
    page2.banners.heroText = $('pg2-heroText').value.trim();
    page2.banners.secondaryText = $('pg2-secondaryText').value.trim();
    page2.promociones = [$('pg2-promo1').value.trim(), $('pg2-promo2').value.trim(), $('pg2-promo3').value.trim()].filter(Boolean);
    page2.contacto.whatsapp = $('pg2-whatsapp').value.trim();
    page2.contacto.phone = $('pg2-phone').value.trim();
    page2.contacto.address = $('pg2-address').value.trim();
    page2.categorias = detectCategories(normalizeProducts(getState()?.products));
  }

  function bindInputs(){
    ['pg2-businessName','pg2-title','pg2-subtitle','pg2-trust','pg2-heroText','pg2-secondaryText','pg2-promo1','pg2-promo2','pg2-promo3','pg2-whatsapp','pg2-phone','pg2-address'].forEach(id=>{
      const el=$(id); if(!el) return;
      el.addEventListener('input', ()=>{ readForm(); renderPreview(); });
    });
    $('pg2-save')?.addEventListener('click', ()=>{ readForm(); saveCfg(); alert('Página 2.0 · base modular guardada.'); });
    $('pg2-reset')?.addEventListener('click', ()=>{ page2 = clone(defaultData); fillForm(); renderPreview(); saveCfg(); });
  }

  bindTabs();
  fillForm();
  bindInputs();
  renderPreview();
})();
