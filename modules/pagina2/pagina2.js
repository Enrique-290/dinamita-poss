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
    catalogo:{limit:24, featuredCount:4, topCount:4, newCount:4},
    categorias:[],
    promociones:['2x1 en membresías','Creatina + shaker','Promoción de la semana'],
    contacto:{whatsapp:'',phone:defaultBiz.phone||'',address:defaultBiz.address||'',maps:'',facebook:'',instagram:'',hours:'Lun a Dom · 6:00 AM a 10:00 PM'},
    pageCart:[],
    selectedProductId:''
  };

  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function money(v){ return typeof dpFmtMoney==='function' ? dpFmtMoney(v||0) : '$'+Number(v||0).toFixed(2); }
  function escHtml(str){ return String(str ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  function normalizeProducts(raw){
    return (Array.isArray(raw)?raw:[]).map((p,idx)=>({
      id: p?.id || p?.sku || `prod-${idx+1}`,
      name: String(p?.name || 'Producto').trim(),
      price: Number(p?.price || 0),
      category: String(p?.category || p?.brand || 'General').trim() || 'General',
      stock: Number(p?.stock || 0),
      image: p?.image || p?.imageUrl || '',
      isNew: p?.isNew ?? (idx < 6),
      isOffer: p?.isOffer ?? (Number(p?.price||0) > 0 && idx % 4 === 0),
      sold: Math.max(0, Number(p?.sold || p?.qtySold || 0)) || (idx===0?12:idx===1?8:idx===2?6:idx===3?5:0),
      featured: p?.featured ?? (idx < 8)
    })).filter(p=>p.name);
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
      categorias:Array.isArray(cur.categorias)&&cur.categorias.length?cur.categorias.slice():detectCategories(products),
      pageCart:Array.isArray(cur.pageCart)?cur.pageCart:[],
      selectedProductId:cur.selectedProductId || ''
    };
  }

  let page2 = getCfg();
  let currentCategory = 'Todos';

  function getCartItems(products){
    const map = new Map(products.map(p=>[String(p.id), p]));
    return (Array.isArray(page2.pageCart)?page2.pageCart:[]).map(it=>{
      const p = map.get(String(it.id));
      if(!p) return null;
      return { ...p, qty: Math.max(1, Number(it.qty||1)) };
    }).filter(Boolean);
  }

  function cartTotal(items){
    return items.reduce((acc,it)=>acc + (Number(it.price||0) * Number(it.qty||1)), 0);
  }

  function addToCart(productId){
    const id = String(productId);
    page2.pageCart = Array.isArray(page2.pageCart) ? page2.pageCart : [];
    const found = page2.pageCart.find(it=>String(it.id)===id);
    if(found) found.qty = Math.max(1, Number(found.qty||1) + 1);
    else page2.pageCart.push({ id, qty: 1 });
    saveCfg();
    renderPreview();
  }

  function updateCartQty(productId, delta){
    const id = String(productId);
    page2.pageCart = (Array.isArray(page2.pageCart)?page2.pageCart:[]).map(it=>{
      if(String(it.id)!==id) return it;
      return { ...it, qty: Math.max(0, Number(it.qty||1) + delta) };
    }).filter(it=>Number(it.qty||0) > 0);
    saveCfg();
    renderPreview();
  }

  function removeFromCart(productId){
    const id = String(productId);
    page2.pageCart = (Array.isArray(page2.pageCart)?page2.pageCart:[]).filter(it=>String(it.id)!==id);
    saveCfg();
    renderPreview();
  }

  function clearCart(){
    page2.pageCart = [];
    saveCfg();
    renderPreview();
  }

  function saveCfg(){
    if(typeof dpSetState!=='function') return;
    dpSetState(st=>{
      st.config = st.config || {};
      st.config.website2 = clone(page2);
      return st;
    });
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
          <div class="pg2CardMeta">${p.category} · Stock ${p.stock}</div>
          <div class="pg2CardPrice">${money(p.price||0)}</div>
          <div class="pg2CardActions">
            <button class="btn btn--ghost" type="button" data-detail="${p.id}">Detalle</button>
            <button class="btn btn--ghost" type="button" data-wa-product="${p.id}">WhatsApp</button>
            <button class="btn" type="button" data-add="${p.id}">Agregar</button>
          </div>
        </div>
      </article>`;
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
          <button class="btn" type="button" data-wa-general="hero">Entrenar ahora</button>
          <button class="btn btn--ghost" type="button" data-go-catalog="1">Ver catálogo</button>
        </div>
      </section>`;
  }

  function renderCategorias(ctx){
    const all = ['Todos', ...ctx.categories];
    const chips = all.length
      ? all.map(c=>`<button class="pg2__chipBtn ${currentCategory===c?'active':''}" data-cat="${c}" type="button">${c}</button>`).join('')
      : '<span class="muted">Sin categorías detectadas.</span>';
    return `
      <section class="pg2Block">
        <div class="pg2SectionHead"><h3>Categorías</h3><span>${ctx.categories.length} detectadas</span></div>
        <div class="pg2__chips">${chips}</div>
      </section>`;
  }

  function renderCardsSection(title, items, chip=''){
    return `
      <section class="pg2Block">
        <div class="pg2SectionHead"><h3>${title}</h3><span>${items.length} productos</span></div>
        <div class="pg2Cards">${items.length ? items.map(p=>productCard(p, chip)).join('') : '<div class="muted">No hay productos para mostrar.</div>'}</div>
      </section>`;
  }

  function renderDestacados(ctx){
    const featured = ctx.products.filter(p=>p.featured).slice(0, ctx.catalogo.featuredCount || 4);
    return renderCardsSection('Productos destacados', featured, 'Destacado');
  }

  function renderMasVendidos(ctx){
    const top = [...ctx.products].sort((a,b)=>b.sold-a.sold).filter(p=>p.sold>0).slice(0, ctx.catalogo.topCount || 4);
    return renderCardsSection('Lo más vendido', top, 'Top');
  }

  function renderCatalogo(ctx){
    const base = currentCategory==='Todos' ? ctx.products : ctx.products.filter(p=>p.category===currentCategory);
    const items = base.slice(0, Math.max(1, ctx.catalogo.limit || 24));
    return `
      <section class="pg2Block">
        <div class="pg2SectionHead"><h3>Catálogo</h3><span>Vista actual: ${currentCategory}</span></div>
        <div class="pg2Cards">${items.length ? items.map(p=>productCard(p)).join('') : '<div class="muted">No hay productos en esta categoría.</div>'}</div>
      </section>`;
  }

  function renderNuevos(ctx){
    const items = ctx.products.filter(p=>p.isNew).slice(0, ctx.catalogo.newCount || 4);
    return renderCardsSection('Nuevos productos', items, 'Nuevo');
  }

  function renderCarrito(ctx){
    const items = getCartItems(ctx.products);
    const rows = items.length
      ? items.map(it=>`<div class="pg2CartRow">
          <div class="pg2CartInfo">
            <strong>${it.name}</strong>
            <span>${money(it.price||0)} c/u</span>
          </div>
          <div class="pg2CartQty">
            <button class="btn btn--ghost btn--mini" type="button" data-cart-dec="${it.id}">−</button>
            <span>${it.qty}</span>
            <button class="btn btn--ghost btn--mini" type="button" data-cart-inc="${it.id}">+</button>
            <button class="btn btn--ghost btn--mini" type="button" data-cart-remove="${it.id}">Quitar</button>
          </div>
        </div>`).join('')
      : '<div class="muted">Tu carrito está vacío.</div>';
    return `
      <section class="pg2Block pg2CartBlock">
        <div class="pg2SectionHead"><h3>Carrito</h3><span>${items.length} productos</span></div>
        <div class="pg2CartList">${rows}</div>
        <div class="pg2CartFoot">
          <strong>Total: ${money(cartTotal(items))}</strong>
          <div class="pg2CartBtns">
            <button class="btn btn--ghost" type="button" data-cart-clear="1">Vaciar</button>
            <button class="btn" type="button" data-cart-send="1">Enviar por WhatsApp (V25.4)</button>
          </div>
        </div>
      </section>`;
  }

  function renderContacto(ctx){
    const mapsBtn = ctx.contacto.maps ? `<a class="btn btn--ghost" href="${ctx.contacto.maps}" target="_blank" rel="noopener noreferrer">Cómo llegar</a>` : '';
    const socials = [
      ctx.contacto.facebook ? `<a class="pg2Social" href="${ctx.contacto.facebook}" target="_blank" rel="noopener noreferrer">Facebook</a>` : '',
      ctx.contacto.instagram ? `<a class="pg2Social" href="${ctx.contacto.instagram}" target="_blank" rel="noopener noreferrer">Instagram</a>` : ''
    ].filter(Boolean).join('');
    return `
      <section class="pg2Block pg2ContactBlock">
        <div class="pg2SectionHead"><h3>Contacto</h3><span>Bloque pro</span></div>
        <div class="pg2ContactGrid">
          <div class="pg2ContactCard"><strong>WhatsApp</strong><span>${ctx.contacto.whatsapp || 'Pendiente'}</span></div>
          <div class="pg2ContactCard"><strong>Teléfono</strong><span>${ctx.contacto.phone || 'Pendiente'}</span></div>
          <div class="pg2ContactCard"><strong>Horario</strong><span>${ctx.contacto.hours || 'Pendiente'}</span></div>
          <div class="pg2ContactCard"><strong>Dirección</strong><span>${ctx.contacto.address || 'Pendiente'}</span></div>
        </div>
        <div class="pg2HeroActions">
          <button class="btn" type="button" data-wa-general="contacto">Escríbenos por WhatsApp</button>
          ${mapsBtn}
        </div>
        ${socials ? `<div class="pg2Socials">${socials}</div>` : ''}
        <div class="pg2Trust">${ctx.general.trust || ''}</div>
      </section>`;
  }

  function renderFooter(ctx){
    return `
      <section class="pg2Block pg2FooterBlock">
        <div>Página 2.0 · Catálogo y categorías reales activos.</div>
        <div><strong>${ctx.general.businessName || 'Dinamita Gym'}</strong></div>
      </section>`;
  }



  function normalizeMxPhone(raw){
    const digits = String(raw || '').replace(/\D/g,'');
    if(!digits) return '';
    if(digits.length===10) return `521${digits}`;
    if(digits.length===12 && digits.startsWith('52')) return `521${digits.slice(2)}`;
    if(digits.length===13 && digits.startsWith('521')) return digits;
    return digits;
  }

  function getWhatsAppNumber(){
    const fromPage = normalizeMxPhone(page2?.contacto?.whatsapp);
    const fromPhone = normalizeMxPhone(page2?.contacto?.phone);
    return fromPage || fromPhone || '';
  }

  function openWhatsAppLink(message){
    const phone = getWhatsAppNumber();
    if(!phone){
      alert('Configura un WhatsApp o teléfono válido en Contacto.');
      return;
    }
    const text = encodeURIComponent(message);
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function buildProductMessage(product){
    return `Hola, me interesa:
${product.name}
Categoría: ${product.category}
Precio: ${money(product.price||0)}`;
  }

  function buildCartMessage(items){
    const lines = items.map(it => `- ${it.name} x${it.qty} = ${money((it.price||0) * (it.qty||1))}`);
    return `Hola, quiero hacer este pedido:

${lines.join('\n')}

Total: ${money(cartTotal(items))}`;
  }

  function buildGeneralMessage(source){
    const title = page2?.general?.title || 'Dinamita Gym';
    return source==='contacto'
      ? `Hola, me interesa recibir información de ${title}.`
      : `Hola, me interesa entrenar en ${title}.`;
  }

  function openProductDetail(productId){
    page2.selectedProductId = String(productId || '');
    renderPreview();
  }

  function closeProductDetail(){
    page2.selectedProductId = '';
    renderPreview();
  }

  function renderProductDetail(ctx){
    const selected = ctx.products.find(p=>String(p.id)===String(page2.selectedProductId||''));
    if(!selected) return '';
    const img = selected.image
      ? `<img src="${selected.image}" alt="${selected.name}" class="pg2DetailImg">`
      : `<div class="pg2DetailImg pg2CardImg--placeholder">${(selected.name||'P').slice(0,1).toUpperCase()}</div>`;
    return `
      <div class="pg2DetailOverlay" data-detail-overlay="1">
        <div class="pg2DetailModal">
          <button class="pg2DetailClose" type="button" data-detail-close="1">×</button>
          <div class="pg2DetailGrid">
            <div>${img}</div>
            <div class="pg2DetailBody">
              <span class="pg2DetailCat">${selected.category}</span>
              <h3>${selected.name}</h3>
              <div class="pg2DetailPrice">${money(selected.price||0)}</div>
              <p>${selected.description || 'Producto disponible en el catálogo de Dinamita Gym. Atención personalizada y compra por WhatsApp.'}</p>
              <div class="pg2DetailMeta">Stock: ${selected.stock}</div>
              <div class="pg2HeroActions">
                <button class="btn" type="button" data-add="${selected.id}">Agregar al carrito</button>
                <button class="btn btn--ghost" type="button" data-wa-product="${selected.id}">Comprar por WhatsApp</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function getCtx(){
    const st = getState();
    const products = normalizeProducts(st?.products);
    const categories = detectCategories(products);
    if(currentCategory!=='Todos' && !categories.includes(currentCategory)) currentCategory='Todos';
    return {
      ...page2,
      products,
      categories,
      catalogo: {...defaultData.catalogo, ...(page2.catalogo||{})}
    };
  }

  function bindPreviewEvents(){
    document.querySelectorAll('#pg2-preview [data-cat]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        currentCategory = btn.dataset.cat || 'Todos';
        renderPreview();
      });
    });
    document.querySelectorAll('#pg2-preview [data-add]').forEach(btn=>{
      btn.addEventListener('click',()=> addToCart(btn.dataset.add));
    });
    document.querySelectorAll('#pg2-preview [data-wa-product]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const ctx = getCtx();
        const product = ctx.products.find(p=>String(p.id)===String(btn.dataset.waProduct));
        if(product) openWhatsAppLink(buildProductMessage(product));
      });
    });
    document.querySelectorAll('#pg2-preview [data-cart-inc]').forEach(btn=>{
      btn.addEventListener('click',()=> updateCartQty(btn.dataset.cartInc, 1));
    });
    document.querySelectorAll('#pg2-preview [data-cart-dec]').forEach(btn=>{
      btn.addEventListener('click',()=> updateCartQty(btn.dataset.cartDec, -1));
    });
    document.querySelectorAll('#pg2-preview [data-cart-remove]').forEach(btn=>{
      btn.addEventListener('click',()=> removeFromCart(btn.dataset.cartRemove));
    });
    document.querySelectorAll('#pg2-preview [data-cart-clear]').forEach(btn=>{
      btn.addEventListener('click',()=> clearCart());
    });
    document.querySelectorAll('#pg2-preview [data-cart-send]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const ctx = getCtx();
        const items = getCartItems(ctx.products);
        if(!items.length){
          alert('Tu carrito está vacío.');
          return;
        }
        openWhatsAppLink(buildCartMessage(items));
      });
    });
    document.querySelectorAll('#pg2-preview [data-wa-general]').forEach(btn=>{
      btn.addEventListener('click',()=> openWhatsAppLink(buildGeneralMessage(btn.dataset.waGeneral)));
    });
    document.querySelectorAll('#pg2-preview [data-go-catalog]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        currentCategory = 'Todos';
        renderPreview();
      });
    });
    document.querySelectorAll('#pg2-preview [data-detail]').forEach(btn=>{
      btn.addEventListener('click',()=> openProductDetail(btn.dataset.detail));
    });
    document.querySelectorAll('#pg2-preview [data-detail-close]').forEach(btn=>{
      btn.addEventListener('click',()=> closeProductDetail());
    });
    document.querySelectorAll('#pg2-preview [data-detail-overlay]').forEach(el=>{
      el.addEventListener('click',(e)=>{ if(e.target===el) closeProductDetail(); });
    });
  }

  function renderPreview(){
    const preview = $('pg2-preview');
    if(!preview) return;
    const ctx = getCtx();
    preview.innerHTML = [
      renderHeader(ctx),
      renderHero(ctx),
      renderCategorias(ctx),
      renderDestacados(ctx),
      renderMasVendidos(ctx),
      renderNuevos(ctx),
      renderCatalogo(ctx),
      renderCarrito(ctx),
      renderContacto(ctx),
      renderFooter(ctx),
      renderProductDetail(ctx)
    ].join('');
    bindPreviewEvents();
  }



  function downloadFile(filename, content, mime){
    const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=> URL.revokeObjectURL(url), 1000);
  }

  function buildExportData(){
    const ctx = getCtx();
    return {
      generatedAt: new Date().toISOString(),
      general: ctx.general,
      banners: ctx.banners,
      catalogo: ctx.catalogo,
      promociones: ctx.promociones,
      contacto: ctx.contacto,
      categories: ctx.categories,
      products: ctx.products,
      pageCart: ctx.pageCart || []
    };
  }

  function buildStandaloneHtml(){
    const data = JSON.stringify(buildExportData());
    const css = `
:root{--dp-red:#c00000;--bg:#f6f7fb;--card:#ffffff;--line:#ececec;--text:#111;--muted:#666}
*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;background:var(--bg);color:var(--text)}
a{text-decoration:none;color:inherit}.wrap{max-width:1200px;margin:0 auto;padding:20px;display:grid;gap:16px}.btn{appearance:none;border:none;background:var(--dp-red);color:#fff;border-radius:12px;padding:10px 14px;font-weight:700;cursor:pointer}.btn--ghost{background:#fff;color:#111;border:1px solid var(--line)}
.pg2Block{background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px;box-shadow:0 6px 16px rgba(0,0,0,.04)}
.pg2Header{display:flex;align-items:center;gap:12px}.pg2BrandMark{width:44px;height:44px;border-radius:14px;background:var(--dp-red);color:#fff;display:grid;place-items:center;font-size:22px;font-weight:800}.pg2BrandName{font-size:20px;font-weight:800}.pg2BrandSub{font-size:12px;color:var(--muted)}
.pg2Hero{display:grid;gap:8px;background:linear-gradient(135deg,#111,#2b2b2b);color:#fff}.pg2Hero h1{margin:0;font-size:30px}.pg2HeroActions{display:flex;gap:8px;flex-wrap:wrap}
.pg2SectionHead{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}.pg2SectionHead h3{margin:0}.pg2__chips{display:flex;gap:8px;flex-wrap:wrap}.pg2__chipBtn{border:1px solid #e7e7e7;background:#fff;border-radius:999px;padding:7px 12px;cursor:pointer;font-weight:700}.pg2__chipBtn.active{background:var(--dp-red);color:#fff;border-color:var(--dp-red)}
.pg2Cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.pg2Card{position:relative;border:1px solid var(--line);border-radius:16px;background:#fff;overflow:hidden;box-shadow:0 6px 16px rgba(0,0,0,.04)}.pg2CardBadge{position:absolute;top:10px;left:10px;background:var(--dp-red);color:#fff;font-size:11px;border-radius:999px;padding:4px 8px;z-index:2}.pg2CardImg{width:100%;height:170px;object-fit:cover;background:#f3f3f3}.pg2CardImg--placeholder{display:grid;place-items:center;font-size:48px;font-weight:800;color:#999}.pg2CardBody{padding:12px;display:grid;gap:6px}.pg2CardMeta{font-size:12px;color:var(--muted)}.pg2CardPrice{font-size:18px;font-weight:800}.pg2CardActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}.pg2Social{display:inline-flex;padding:8px 12px;border-radius:999px;background:#f5f5f5;border:1px solid #e8e8e8;color:#111;text-decoration:none;font-weight:700}
.pg2CartBlock{display:grid;gap:12px}.pg2CartList{display:grid;gap:10px}.pg2CartRow{display:flex;justify-content:space-between;gap:12px;align-items:center;border:1px solid var(--line);border-radius:14px;padding:10px;background:#fff}.pg2CartInfo{display:grid;gap:3px}.pg2CartInfo span{font-size:12px;color:var(--muted)}.pg2CartQty{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.btn--mini{padding:4px 8px;font-size:12px;border-radius:10px}.pg2CartFoot{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;border-top:1px dashed #e3e3e3;padding-top:10px}.pg2CartBtns{display:flex;gap:8px;flex-wrap:wrap}
.pg2ContactGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}.pg2ContactCard{border:1px solid var(--line);border-radius:14px;padding:12px;background:#fff;display:grid;gap:4px}.pg2ContactCard span{font-size:13px;color:#555;line-height:1.4}.pg2Socials{display:flex;gap:8px;flex-wrap:wrap}.pg2Trust{margin-top:6px;color:#555}
.pg2DetailOverlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:grid;place-items:center;padding:20px;z-index:50}.pg2DetailModal{width:min(900px,100%);background:#fff;border-radius:22px;padding:20px;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.25)}.pg2DetailClose{position:absolute;top:12px;right:12px;width:38px;height:38px;border-radius:999px;border:1px solid #e5e5e5;background:#fff;font-size:24px;cursor:pointer}.pg2DetailGrid{display:grid;grid-template-columns:minmax(260px,360px) 1fr;gap:18px;align-items:start}.pg2DetailImg{width:100%;height:320px;object-fit:cover;border-radius:18px;background:#f3f3f3}.pg2DetailBody{display:grid;gap:10px}.pg2DetailBody h3{margin:0;font-size:28px}.pg2DetailCat{display:inline-flex;width:max-content;padding:5px 10px;border-radius:999px;background:#111;color:#fff;font-size:12px;font-weight:700}.pg2DetailPrice{font-size:28px;font-weight:800;color:var(--dp-red)}.pg2DetailMeta{font-size:13px;color:var(--muted)}
.wa-float{position:fixed;right:18px;bottom:18px;z-index:60;background:#25D366;color:#fff;border-radius:999px;padding:14px 16px;font-weight:800;box-shadow:0 10px 25px rgba(0,0,0,.18)}
@media (max-width:760px){.wrap{padding:14px}.pg2DetailGrid{grid-template-columns:1fr}.pg2DetailImg{height:240px}}
    `;
    const js = `
const DATA = ${data};
let currentCategory = 'Todos';
let cart = Array.isArray(DATA.pageCart) ? DATA.pageCart.slice() : [];
let selectedProductId = '';
const money = v => '$' + Number(v||0).toFixed(2);
const normalizeMxPhone = raw => { const digits = String(raw||'').replace(/\D/g,''); if(!digits) return ''; if(digits.length===10) return '521'+digits; if(digits.length===12 && digits.startsWith('52')) return '521'+digits.slice(2); if(digits.length===13 && digits.startsWith('521')) return digits; return digits; };
const getPhone = () => normalizeMxPhone(DATA.contacto?.whatsapp) || normalizeMxPhone(DATA.contacto?.phone);
const openWhatsApp = (message) => { const phone = getPhone(); if(!phone){ alert('Configura un WhatsApp o teléfono válido.'); return; } window.open('https://api.whatsapp.com/send?phone='+phone+'&text='+encodeURIComponent(message),'_blank','noopener,noreferrer'); };
const productById = id => DATA.products.find(p => String(p.id)===String(id));
const cartItems = () => cart.map(it => ({...productById(it.id), qty: it.qty||1})).filter(it=>it && it.name);
const cartTotal = () => cartItems().reduce((a,it)=>a + Number(it.price||0)*Number(it.qty||1), 0);
function addToCart(id){ const item = cart.find(x=>String(x.id)===String(id)); if(item) item.qty++; else cart.push({id:String(id),qty:1}); render(); }
function changeQty(id, delta){ cart = cart.map(it => String(it.id)===String(id) ? ({...it, qty: Math.max(0, Number(it.qty||1)+delta)}) : it).filter(it=>it.qty>0); render(); }
function clearCart(){ cart=[]; render(); }
function productCard(p, tag=''){ const img = p.image ? '<img src="'+p.image+'" alt="'+p.name+'" class="pg2CardImg">' : '<div class="pg2CardImg pg2CardImg--placeholder">'+(p.name||'P').slice(0,1).toUpperCase()+'</div>'; const badge = tag ? '<span class="pg2CardBadge">'+tag+'</span>' : ''; return '<article class="pg2Card">'+badge+img+'<div class="pg2CardBody"><strong>'+p.name+'</strong><div class="pg2CardMeta">'+p.category+' · Stock '+p.stock+'</div><div class="pg2CardPrice">'+money(p.price||0)+'</div><div class="pg2CardActions"><button class="btn btn--ghost" data-detail="'+p.id+'">Detalle</button><button class="btn btn--ghost" data-wa-product="'+p.id+'">WhatsApp</button><button class="btn" data-add="'+p.id+'">Agregar</button></div></div></article>'; }
function renderDetail(){ const p = productById(selectedProductId); if(!p) return ''; const img = p.image ? '<img src="'+p.image+'" alt="'+p.name+'" class="pg2DetailImg">' : '<div class="pg2DetailImg pg2CardImg--placeholder">'+(p.name||'P').slice(0,1).toUpperCase()+'</div>'; return '<div class="pg2DetailOverlay" data-detail-overlay="1"><div class="pg2DetailModal"><button class="pg2DetailClose" data-detail-close="1">×</button><div class="pg2DetailGrid"><div>'+img+'</div><div class="pg2DetailBody"><span class="pg2DetailCat">'+p.category+'</span><h3>'+p.name+'</h3><div class="pg2DetailPrice">'+money(p.price||0)+'</div><p>'+(p.description || 'Producto disponible en el catálogo de Dinamita Gym. Atención personalizada y compra por WhatsApp.')+'</p><div class="pg2DetailMeta">Stock: '+p.stock+'</div><div class="pg2HeroActions"><button class="btn" data-add="'+p.id+'">Agregar al carrito</button><button class="btn btn--ghost" data-wa-product="'+p.id+'">Comprar por WhatsApp</button></div></div></div></div></div>'; }
function render(){ const products = Array.isArray(DATA.products) ? DATA.products.slice() : []; const categories = ['Todos', ...(DATA.categories||[])]; const filtered = currentCategory==='Todos' ? products : products.filter(p=>p.category===currentCategory); const featured = products.filter(p=>p.featured).slice(0, DATA.catalogo?.featuredCount || 4); const top = products.slice().sort((a,b)=>(b.sold||0)-(a.sold||0)).filter(p=>(p.sold||0)>0).slice(0, DATA.catalogo?.topCount || 4); const newer = products.filter(p=>p.isNew).slice(0, DATA.catalogo?.newCount || 4); const items = filtered.slice(0, DATA.catalogo?.limit || 24); const cartRows = cartItems().map(it => '<div class="pg2CartRow"><div class="pg2CartInfo"><strong>'+it.name+'</strong><span>'+money(it.price||0)+' c/u</span></div><div class="pg2CartQty"><button class="btn btn--ghost btn--mini" data-cart-dec="'+it.id+'">−</button><span>'+it.qty+'</span><button class="btn btn--ghost btn--mini" data-cart-inc="'+it.id+'">+</button><button class="btn btn--ghost btn--mini" data-cart-remove="'+it.id+'">Quitar</button></div></div>').join('') || '<div class="muted">Tu carrito está vacío.</div>';
    document.getElementById('app').innerHTML = '<div class="wrap">'
      + '<section class="pg2Block pg2Header"><div class="pg2BrandMark">💥</div><div><div class="pg2BrandName">'+(DATA.general?.businessName || 'Dinamita Gym')+'</div><div class="pg2BrandSub">Página exportada · Página 2.0</div></div></section>'
      + '<section class="pg2Block pg2Hero"><small>Catálogo web</small><h1>'+(DATA.general?.title || 'Explota tu potencial')+'</h1><div>'+(DATA.general?.subtitle || '')+'</div><div class="pg2HeroPromo"><strong>'+(DATA.banners?.heroText||'Promo principal')+'</strong> · '+(DATA.banners?.secondaryText||'Promo secundaria')+'</div><div class="pg2HeroActions"><button class="btn" data-wa-general="hero">Entrenar ahora</button><button class="btn btn--ghost" data-go-catalog="1">Ver catálogo</button></div></section>'
      + '<section class="pg2Block"><div class="pg2SectionHead"><h3>Categorías</h3><span>'+(categories.length-1)+' detectadas</span></div><div class="pg2__chips">'+categories.map(c=>'<button class="pg2__chipBtn '+(currentCategory===c?'active':'')+'" data-cat="'+c+'">'+c+'</button>').join('')+'</div></section>'
      + '<section class="pg2Block"><div class="pg2SectionHead"><h3>Productos destacados</h3><span>'+featured.length+' productos</span></div><div class="pg2Cards">'+(featured.map(p=>productCard(p,'Destacado')).join('') || '<div class="muted">Sin productos.</div>')+'</div></section>'
      + '<section class="pg2Block"><div class="pg2SectionHead"><h3>Lo más vendido</h3><span>'+top.length+' productos</span></div><div class="pg2Cards">'+(top.map(p=>productCard(p,'Top')).join('') || '<div class="muted">Sin productos.</div>')+'</div></section>'
      + '<section class="pg2Block"><div class="pg2SectionHead"><h3>Nuevos productos</h3><span>'+newer.length+' productos</span></div><div class="pg2Cards">'+(newer.map(p=>productCard(p,'Nuevo')).join('') || '<div class="muted">Sin productos.</div>')+'</div></section>'
      + '<section class="pg2Block"><div class="pg2SectionHead"><h3>Catálogo</h3><span>Vista actual: '+currentCategory+'</span></div><div class="pg2Cards">'+(items.map(p=>productCard(p)).join('') || '<div class="muted">No hay productos.</div>')+'</div></section>'
      + '<section class="pg2Block pg2CartBlock"><div class="pg2SectionHead"><h3>Carrito</h3><span>'+cartItems().length+' productos</span></div><div class="pg2CartList">'+cartRows+'</div><div class="pg2CartFoot"><strong>Total: '+money(cartTotal())+'</strong><div class="pg2CartBtns"><button class="btn btn--ghost" data-cart-clear="1">Vaciar</button><button class="btn" data-cart-send="1">Enviar por WhatsApp</button></div></div></section>'
      + '<section class="pg2Block"><div class="pg2SectionHead"><h3>Promociones</h3><span>'+(DATA.promociones||[]).length+' activas</span></div><div class="pg2__chips">'+(DATA.promociones||[]).map(p=>'<span class="pg2__chip">'+p+'</span>').join('')+'</div></section>'
      + '<section class="pg2Block pg2ContactBlock"><div class="pg2SectionHead"><h3>Contacto</h3><span>Bloque pro</span></div><div class="pg2ContactGrid"><div class="pg2ContactCard"><strong>WhatsApp</strong><span>'+(DATA.contacto?.whatsapp || 'Pendiente')+'</span></div><div class="pg2ContactCard"><strong>Teléfono</strong><span>'+(DATA.contacto?.phone || 'Pendiente')+'</span></div><div class="pg2ContactCard"><strong>Horario</strong><span>'+(DATA.contacto?.hours || 'Pendiente')+'</span></div><div class="pg2ContactCard"><strong>Dirección</strong><span>'+(DATA.contacto?.address || 'Pendiente')+'</span></div></div><div class="pg2HeroActions"><button class="btn" data-wa-general="contacto">Escríbenos por WhatsApp</button>'+(DATA.contacto?.maps ? '<a class="btn btn--ghost" href="'+DATA.contacto.maps+'" target="_blank" rel="noopener noreferrer">Cómo llegar</a>' : '')+'</div>' + ((DATA.contacto?.facebook || DATA.contacto?.instagram) ? '<div class="pg2Socials">'+(DATA.contacto?.facebook ? '<a class="pg2Social" href="'+DATA.contacto.facebook+'" target="_blank" rel="noopener noreferrer">Facebook</a>' : '')+(DATA.contacto?.instagram ? '<a class="pg2Social" href="'+DATA.contacto.instagram+'" target="_blank" rel="noopener noreferrer">Instagram</a>' : '')+'</div>' : '') + '<div class="pg2Trust">'+(DATA.general?.trust || '')+'</div></section>'
      + '<section class="pg2Block pg2FooterBlock"><div>Página exportada desde Dinamita POS · Página 2.0</div><div><strong>'+(DATA.general?.businessName || 'Dinamita Gym')+'</strong></div></section>'
      + '</div><button class="wa-float" data-wa-general="float">WhatsApp</button>' + renderDetail();
    bind();
}
function bind(){ document.querySelectorAll('[data-cat]').forEach(el=>el.onclick=()=>{ currentCategory = el.dataset.cat; render(); }); document.querySelectorAll('[data-add]').forEach(el=>el.onclick=()=>addToCart(el.dataset.add)); document.querySelectorAll('[data-detail]').forEach(el=>el.onclick=()=>{ selectedProductId = el.dataset.detail; render(); }); document.querySelectorAll('[data-detail-close],[data-detail-overlay]').forEach(el=>el.onclick=(e)=>{ if(!el.dataset.detailOverlay || e.target===el){ selectedProductId=''; render(); } }); document.querySelectorAll('[data-wa-product]').forEach(el=>el.onclick=()=>{ const p = productById(el.dataset.waProduct); if(p) openWhatsApp('Hola, me interesa:\n'+p.name+'\nCategoría: '+p.category+'\nPrecio: '+money(p.price||0)); }); document.querySelectorAll('[data-wa-general]').forEach(el=>el.onclick=()=>openWhatsApp(el.dataset.waGeneral==='contacto' ? 'Hola, me interesa recibir información de '+(DATA.general?.title||'Dinamita Gym')+'.' : 'Hola, me interesa entrenar en '+(DATA.general?.title||'Dinamita Gym')+'.')); document.querySelectorAll('[data-cart-inc]').forEach(el=>el.onclick=()=>changeQty(el.dataset.cartInc,1)); document.querySelectorAll('[data-cart-dec]').forEach(el=>el.onclick=()=>changeQty(el.dataset.cartDec,-1)); document.querySelectorAll('[data-cart-remove]').forEach(el=>el.onclick=()=>changeQty(el.dataset.cartRemove,-999)); document.querySelectorAll('[data-cart-clear]').forEach(el=>el.onclick=()=>clearCart()); document.querySelectorAll('[data-cart-send]').forEach(el=>el.onclick=()=>{ const items = cartItems(); if(!items.length){ alert('Tu carrito está vacío.'); return; } openWhatsApp('Hola, quiero hacer este pedido:\n\n'+items.map(it=>'- '+it.name+' x'+it.qty+' = '+money((it.price||0)*(it.qty||1))).join('\n')+'\n\nTotal: '+money(cartTotal())); }); document.querySelectorAll('[data-go-catalog]').forEach(el=>el.onclick=()=>{ currentCategory='Todos'; render(); }); }
render();
    `;
    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(page2.general.businessName || 'Dinamita Gym')} · Página 2.0</title>
<style>${css}</style>
</head>
<body>
<div id="app"></div>
<script>${js}<'+'/script>
</body>
</html>`;
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
    $('pg2-hours').value = page2.contacto.hours || '';
    $('pg2-maps').value = page2.contacto.maps || '';
    $('pg2-facebook').value = page2.contacto.facebook || '';
    $('pg2-instagram').value = page2.contacto.instagram || '';
    $('pg2-limit').value = page2.catalogo.limit || 24;
    $('pg2-featuredCount').value = page2.catalogo.featuredCount || 4;
    $('pg2-topCount').value = page2.catalogo.topCount || 4;
    $('pg2-newCount').value = page2.catalogo.newCount || 4;
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
    page2.contacto.hours = $('pg2-hours').value.trim();
    page2.contacto.maps = $('pg2-maps').value.trim();
    page2.contacto.facebook = $('pg2-facebook').value.trim();
    page2.contacto.instagram = $('pg2-instagram').value.trim();
    page2.catalogo.limit = Math.max(1, Number($('pg2-limit').value || 24));
    page2.catalogo.featuredCount = Math.max(1, Number($('pg2-featuredCount').value || 4));
    page2.catalogo.topCount = Math.max(1, Number($('pg2-topCount').value || 4));
    page2.catalogo.newCount = Math.max(1, Number($('pg2-newCount').value || 4));
    page2.categorias = detectCategories(normalizeProducts(getState()?.products));
  }

  function bindInputs(){
    ['pg2-businessName','pg2-title','pg2-subtitle','pg2-trust','pg2-heroText','pg2-secondaryText','pg2-promo1','pg2-promo2','pg2-promo3','pg2-whatsapp','pg2-phone','pg2-address','pg2-hours','pg2-maps','pg2-facebook','pg2-instagram','pg2-limit','pg2-featuredCount','pg2-topCount','pg2-newCount'].forEach(id=>{
      const el=$(id); if(!el) return;
      el.addEventListener('input', ()=>{ readForm(); renderPreview(); });
    });
    $('pg2-save')?.addEventListener('click', ()=>{ readForm(); saveCfg(); alert('Página 2.0 guardada.'); });
    $('pg2-reset')?.addEventListener('click', ()=>{ page2 = clone(defaultData); currentCategory='Todos'; fillForm(); renderPreview(); saveCfg(); });
    $('pg2-export-html')?.addEventListener('click', ()=>{ readForm(); const html = buildStandaloneHtml(); const name = (page2.general.businessName || 'pagina-2-0').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); downloadFile(`${name || 'pagina-2-0'}.html`, html, 'text/html;charset=utf-8'); });
    $('pg2-export-json')?.addEventListener('click', ()=>{ readForm(); downloadFile('pagina-2-0-data.json', JSON.stringify(buildExportData(), null, 2), 'application/json;charset=utf-8'); });
  }

  bindTabs();
  fillForm();
  bindInputs();
  renderPreview();
})();
