(function(){
  const $ = (id)=>document.getElementById(id);
  const biz = (typeof dpGetBizInfo==='function') ? dpGetBizInfo() : {name:'Dinamita Gym',logoDataUrl:'',address:'',phone:'',email:'',social:''};
  const state = dpGetState();
  const cfg = dpGetConfig();
  const catalog = Array.isArray(state?.meta?.business?.membershipCatalog) ? state.meta.business.membershipCatalog : [];
  const products = Array.isArray(state?.products) ? state.products : [];
  const defaultPage = {
    title: 'Explota tu potencial',
    subtitle: 'Entrena, mejora tu rendimiento y compra tus productos en un solo lugar.',
    tagline: 'Tu gym, tus promociones y tu catálogo listos para vender.',
    heroImage: '',
    secondaryImage: '',
    whatsapp: '',
    ctaText: 'Escríbenos por WhatsApp',
    ctaSecondary: 'Ver promociones',
    trustText: 'Atención personalizada, ambiente real de entrenamiento y resultados.',
    address: biz.address || '',
    phone: biz.phone || '',
    facebook: '',
    instagram: '',
    mapsUrl: '',
    membershipsVisible: catalog.slice(0,4).map(x=>x.id),
    featuredProducts: products.slice(0,120).map(x=>x.id),
    promos: ['2x$500 en mensualidades','Creatina + shaker a precio especial','Promociones activas todo el mes']
  };

  function getPageCfg(){
    const current = cfg.website || {};
    return {
      ...defaultPage,
      ...current,
      promos: Array.isArray(current.promos) && current.promos.length ? current.promos : defaultPage.promos.slice(),
      membershipsVisible: Array.isArray(current.membershipsVisible) ? current.membershipsVisible : defaultPage.membershipsVisible.slice(),
      featuredProducts: Array.isArray(current.featuredProducts) ? current.featuredProducts : defaultPage.featuredProducts.slice()
    };
  }

  let page = getPageCfg();

  let previewCart = [];

  function getCartItemKey(kind, id){
    return `${kind}:${id}`;
  }

  function addToCart(kind, id){
    const collection = kind === 'membership' ? catalog : products;
    const item = collection.find(x=> String(x.id) === String(id));
    if(!item) return;
    const key = getCartItemKey(kind, id);
    const existing = previewCart.find(x=> x.key === key);
    if(existing){
      existing.qty += 1;
    } else {
      previewCart.push({
        key,
        kind,
        id: item.id,
        name: item.name,
        price: Number(item.price || 0) || 0,
        meta: kind === 'membership' ? `${Number(item.days||0)} días` : normalizeCategory(item),
        qty: 1
      });
    }
    renderCart();
  }

  function updateCartQty(key, delta){
    const item = previewCart.find(x=> x.key === key);
    if(!item) return;
    item.qty += delta;
    if(item.qty <= 0){
      previewCart = previewCart.filter(x=> x.key !== key);
    }
    renderCart();
  }

  function clearCart(){
    previewCart = [];
    renderCart();
  }

  function cartTotals(){
    const count = previewCart.reduce((acc,it)=>acc + Number(it.qty||0),0);
    const total = previewCart.reduce((acc,it)=>acc + (Number(it.qty||0) * Number(it.price||0)),0);
    return { count, total };
  }

  function cartWaText(){
    const { total } = cartTotals();
    const lines = previewCart.map(it=>`- ${it.name} x${it.qty} ${dpFmtMoney((it.qty||0)*(it.price||0))}`);
    return `Hola, quiero hacer este pedido:%0A%0A${lines.join('%0A')}%0A%0ATotal: ${encodeURIComponent(dpFmtMoney(total))}`;
  }

  function renderCart(){
    const badge = document.querySelector('#pw-cart-count');
    const totalEls = document.querySelectorAll('[data-cart-total]');
    const list = document.querySelector('#pw-cart-items');
    const empty = document.querySelector('#pw-cart-empty');
    const sendBtn = document.querySelector('#pw-cart-send');
    const subtotal = document.querySelector('#pw-cart-total-value');
    const { count, total } = cartTotals();
    if(badge) badge.textContent = String(count);
    totalEls.forEach(el=> el.textContent = dpFmtMoney(total));
    if(subtotal) subtotal.textContent = dpFmtMoney(total);
    if(list){
      list.innerHTML = previewCart.map(it=>`
        <div class="pwCartItem">
          <div>
            <strong>${safeText(it.name)}</strong>
            <small>${safeText(it.meta||'')}</small>
          </div>
          <div class="pwCartItemRight">
            <div class="pwQty">
              <button type="button" data-cart-dec="${it.key}">−</button>
              <span>${it.qty}</span>
              <button type="button" data-cart-inc="${it.key}">+</button>
            </div>
            <strong>${dpFmtMoney((it.qty||0)*(it.price||0))}</strong>
          </div>
        </div>`).join('');
    }
    if(empty) empty.hidden = previewCart.length !== 0;
    if(sendBtn){
      if(previewCart.length){
        sendBtn.href = waLink(decodeURIComponent(cartWaText()));
        sendBtn.classList.remove('is-disabled');
      } else {
        sendBtn.href = '#';
        sendBtn.classList.add('is-disabled');
      }
    }
    document.querySelectorAll('[data-cart-inc]').forEach(btn=> btn.onclick = ()=> updateCartQty(btn.getAttribute('data-cart-inc'), 1));
    document.querySelectorAll('[data-cart-dec]').forEach(btn=> btn.onclick = ()=> updateCartQty(btn.getAttribute('data-cart-dec'), -1));
  }

  function openCart(){
    const modal = $('pw-cart-modal');
    if(!modal) return;
    modal.hidden = false;
    document.body.classList.add('pwModalOpen');
    renderCart();
  }

  function closeCart(){
    const modal = $('pw-cart-modal');
    if(!modal) return;
    modal.hidden = true;
    document.body.classList.remove('pwModalOpen');
  }


  function setVal(id,val){ const el=$(id); if(el && el.type !== 'file') el.value = val ?? ''; }
  function safeText(v=''){ return String(v || '').replace(/[<>]/g,''); }
  function safeUrl(v=''){
    const val = String(v || '').trim();
    if(!val) return '';
    if(/^https?:\/\//i.test(val)) return val;
    if(/^www\./i.test(val)) return `https://${val}`;
    return '';
  }
  function socialLabel(url=''){
    const clean = String(url||'').replace(/^https?:\/\//i,'').replace(/^www\./i,'').replace(/\/$/,'');
    return clean || '';
  }

  function setImagePreview(id, dataUrl){
    const wrap = $(id);
    if(!wrap) return;
    wrap.innerHTML = dataUrl
      ? `<img src="${dataUrl}" alt="preview"> <button class="btn btn--ghost btn--xs" type="button" data-clear-image="${id}">Quitar</button>`
      : '<span class="muted">Sin imagen seleccionada.</span>';
    wrap.querySelector('[data-clear-image]')?.addEventListener('click', ()=>{
      if(id === 'pw-heroImagePreview'){
        page.heroImage = '';
        const input = $('pw-heroImage'); if(input) input.value = '';
      } else if(id === 'pw-secondaryImagePreview'){
        page.secondaryImage = '';
        const input = $('pw-secondaryImage'); if(input) input.value = '';
      }
      setImagePreview(id, '');
      renderPreview();
    });
  }

  function readFileAsDataURL(file){
    return new Promise((resolve,reject)=>{
      const reader = new FileReader();
      reader.onload = ()=> resolve(String(reader.result || ''));
      reader.onerror = ()=> reject(new Error('No se pudo leer la imagen.'));
      reader.readAsDataURL(file);
    });
  }

  function renderMemberships(){
    const wrap = $('pw-memberships');
    if(!wrap) return;
    wrap.innerHTML = catalog.map(item=>`
      <label class="pwCheck">
        <input type="checkbox" value="${item.id}" ${page.membershipsVisible.includes(item.id)?'checked':''}>
        <span><strong>${safeText(item.name)}</strong><small>${Number(item.days||0)} días · ${dpFmtMoney(item.price||0)}</small></span>
      </label>
    `).join('') || '<div class="pwEmpty">No hay membresías configuradas.</div>';
    wrap.querySelectorAll('input[type="checkbox"]').forEach(chk=>chk.addEventListener('change', ()=>{
      const selected = Array.from(wrap.querySelectorAll('input:checked')).map(x=>x.value);
      page.membershipsVisible = selected;
      renderPreview();
    }));
  }

  function normalizeCategory(item){
    return safeText(item?.category || item?.brand || 'Producto');
  }

  function getAllCategories(items){
    return Array.from(new Set((items||[]).map(normalizeCategory).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
  }

  function slugifyCategory(value){
    return String(value || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/^-+|-+$/g,'') || 'categoria';
  }

  function buildCategorySections(items){
    const categories = getAllCategories(items);
    return categories.map(cat=>{
      const slug = slugifyCategory(cat);
      const catItems = items.filter(item => normalizeCategory(item) === cat);
      return `
      <section id="cat-${slug}" class="pwSection pwSection--categoryPage">
        <div class="pwSectionHead">
          <h3>${safeText(cat)}</h3>
          <a class="pwGhostBtn" href="#pw-catalog-home">Volver al catálogo</a>
        </div>
        <div class="pwCategoryHero">
          <div>
            <small class="muted">Categoría</small>
            <strong>${safeText(cat)}</strong>
            <p class="muted">Explora todos los productos disponibles de esta categoría.</p>
          </div>
          <span class="pwChip">${catItems.length} producto${catItems.length===1?'':'s'}</span>
        </div>
        <div class="pwProductGrid">
          ${catItems.map(item=>`<div data-product-card data-name="${safeText(item.name)}" data-category="${normalizeCategory(item)}">${productCard(item)}</div>`).join('')}
        </div>
      </section>`;
    }).join('');
  }

  function getTopSellingItems(limit=4){
    const mostSold = state?.analytics?.mostSold || {};
    const ranked = products
      .map(item=>({ item, sold:Number(mostSold[item.id]||0) }))
      .filter(x=>x.sold>0)
      .sort((a,b)=>b.sold-a.sold || (b.item.price||0)-(a.item.price||0))
      .slice(0, limit);
    return ranked;
  }

  function renderProducts(){
    const wrap = $('pw-products');
    if(!wrap) return;
    const q = String($('pw-productSearch')?.value || '').trim().toLowerCase();
    const filtered = products.filter(item=>{
      if(!q) return true;
      return `${item.name||''} ${normalizeCategory(item)}`.toLowerCase().includes(q);
    });
    wrap.innerHTML = filtered.map(item=>{
      const img = item.image || item.photo || item.imageUrl || '';
      return `
      <label class="pwCheck pwCheck--product">
        <input type="checkbox" value="${item.id}" ${page.featuredProducts.includes(item.id)?'checked':''}>
        <span>
          <strong>${safeText(item.name)}</strong>
          <small>${normalizeCategory(item)} · ${dpFmtMoney(item.price||0)}</small>
        </span>
        <div class="pwCheckThumb">${img ? `<img src="${img}" alt="${safeText(item.name)}">` : 'IMG'}</div>
      </label>`;
    }).join('') || '<div class="pwEmpty">No se encontraron productos con ese filtro.</div>';

    wrap.querySelectorAll('input[type="checkbox"]').forEach(chk=>chk.addEventListener('change', ()=>{
      const checked = Array.from(wrap.querySelectorAll('input:checked')).map(x=>x.value);
      if(checked.length > 120){
        chk.checked = false;
        alert('Máximo 120 productos para la página.');
        return;
      }
      const selectedGlobal = Array.from(document.querySelectorAll('#pw-products input:checked')).map(x=>x.value);
      page.featuredProducts = Array.from(new Set(selectedGlobal)).slice(0,120);
      updateProductsCount();
      renderPreview();
    }));
    updateProductsCount();
  }

  function updateProductsCount(){
    const el = $('pw-productsCount');
    if(el) el.textContent = `${(page.featuredProducts||[]).length} / 120`;
  }

  function normalizeWhatsAppNumber(raw){
    let num = String(raw || '').replace(/\D+/g,'');
    if(!num) return '';
    if(num.length === 10) num = `521${num}`;
    else if(num.length === 12 && num.startsWith('52')) num = `521${num.slice(2)}`;
    else if(num.length === 13 && num.startsWith('521')) num = num;
    return num;
  }

  function waLink(text){
    const num = normalizeWhatsAppNumber(page.whatsapp || page.phone || biz.phone || '');
    if(!num) return '#';
    return `https://wa.me/${num}?text=${encodeURIComponent(text || 'Hola, quiero información de Dinamita Gym.')}`;
  }

  function getProductImage(item){
    return item?.image || item?.photo || item?.imageUrl || '';
  }

  function productFallback(item){
    return safeText((item?.name || 'Producto').split(' ').slice(0,2).map(x=>x[0]||'').join('').toUpperCase() || 'PR');
  }

  function membershipWaText(item){
    return `Hola, me interesa la membresía:
${item.name}
Duración: ${Number(item.days||0)} días
Precio: ${dpFmtMoney(item.price || 0)}`;
  }

  function productWaText(item){
    return `Hola, me interesa el producto:
${item.name}
Categoría: ${normalizeCategory(item)}
Precio: ${dpFmtMoney(item.price || 0)}`;
  }

  function productCard(item){
    const img = getProductImage(item);
    const category = normalizeCategory(item);
    return `
      <div class="pwProductCard">
        <button class="pwProductMedia pwProductMedia--button" type="button" data-product-detail="${item.id}">${img ? `<img src="${img}" alt="${safeText(item.name)}">` : `<div class="pwProductPlaceholder">${productFallback(item)}</div>`}</button>
        <div class="pwProductBody">
          <div class="pwProductMeta"><span class="pwChip">${category}</span></div>
          <strong>${safeText(item.name)}</strong>
          <div class="pwProductPrice">${dpFmtMoney(item.price || 0)}</div>
          <div class="pwProductActions">
            <button class="pwGhostBtn" type="button" data-product-detail="${item.id}">Ver detalle</button>
            <a class="pwPrimaryBtn pwPrimaryBtn--small" href="${waLink(productWaText(item)) }" target="_blank" rel="noopener">WhatsApp</a><button class="pwSecondaryBtn pwPrimaryBtn--small" type="button" data-add-cart="product:${item.id}">Agregar</button>
          </div>
        </div>
      </div>`;
  }

  
  function getFeaturedCategories(items){
    const set = new Set();
    (items || []).forEach(item=>{
      const cat = normalizeCategory(item);
      if(cat) set.add(cat);
    });
    return ['Todo', ...Array.from(set).sort((a,b)=>a.localeCompare(b)), ...(catalog.length ? ['Membresías'] : [])];
  }

  function getHighlightedBrands(items){
    return Array.from(new Set((items || []).map(item => safeText(item?.brand || normalizeCategory(item))).filter(Boolean))).slice(0,6);
  }

  function sortFeaturedForStore(items, topSellingMap){
    return (items || []).slice().sort((a,b)=>{
      const soldA = Number(topSellingMap?.get(String(a?.id)) || 0);
      const soldB = Number(topSellingMap?.get(String(b?.id)) || 0);
      if(soldB !== soldA) return soldB - soldA;
      const newerA = Number(a?.updatedAt || a?.createdAt || a?.ts || 0);
      const newerB = Number(b?.updatedAt || b?.createdAt || b?.ts || 0);
      if(newerB !== newerA) return newerB - newerA;
      return String(a?.name || '').localeCompare(String(b?.name || ''), 'es');
    });
  }

  function buildCatalogToolbar(items){
    const filters = getFeaturedCategories(items);
    return `
      <div class="pwCatalogToolbar">
        <div class="pwCatalogSearchWrap">
          <input class="pwCatalogSearch" id="pw-catalog-search" placeholder="Buscar producto en la página..." type="search">
        </div>
        <div class="pwCatalogFilters">
          ${filters.map((label,idx)=>`<button class="pwFilterChip ${idx===0?'is-active':''}" type="button" data-filter="${safeText(label)}">${safeText(label)}</button>`).join('')}
        </div>
      </div>`;
  }

  function initCatalogInteractions(root){
    if(!root) return;
    const search = root.querySelector('#pw-catalog-search');
    const chips = Array.from(root.querySelectorAll('[data-filter]'));
    const productCards = Array.from(root.querySelectorAll('[data-product-card]'));
    const membershipCards = Array.from(root.querySelectorAll('[data-membership-card]'));
    const empty = root.querySelector('#pw-catalog-empty');
    const pageLabel = root.querySelector('#pw-catalog-page-label');
    let currentFilter = 'Todo';

    function apply(){
      const q = String(search?.value || '').trim().toLowerCase();
      let visibleCount = 0;
      productCards.forEach(card=>{
        const name = String(card.dataset.name || '').toLowerCase();
        const category = String(card.dataset.category || '');
        const matchFilter = currentFilter === 'Todo' || currentFilter === category;
        const matchSearch = !q || name.includes(q) || category.toLowerCase().includes(q);
        const show = matchFilter && matchSearch;
        card.hidden = !show;
        if(show) visibleCount += 1;
      });
      membershipCards.forEach(card=>{
        const name = String(card.dataset.name || '').toLowerCase();
        const matchFilter = currentFilter === 'Todo' || currentFilter === 'Membresías';
        const matchSearch = !q || name.includes(q) || 'membresias'.includes(q) || 'membresías'.includes(q);
        const show = matchFilter && matchSearch;
        card.hidden = !show;
        if(show) visibleCount += 1;
      });
      if(empty) empty.hidden = visibleCount !== 0;
      if(pageLabel) pageLabel.textContent = `Vista actual: ${currentFilter}`;
    }

    search?.addEventListener('input', apply);
    chips.forEach(chip=>chip.addEventListener('click', ()=>{
      currentFilter = chip.dataset.filter || 'Todo';
      chips.forEach(x=>x.classList.toggle('is-active', x===chip));
      apply();
    }));
    apply();
  }

function renderPreview(){
    const target = $('pw-preview');
    if(!target) return;
    const memberships = catalog.filter(x=>page.membershipsVisible.includes(x.id));
    const featured = products.filter(x=>page.featuredProducts.includes(x.id));
    const promos = (page.promos || []).filter(Boolean);
    const sales = Array.isArray(state?.sales) ? state.sales : [];
    const topSellingMap = new Map();
    sales.forEach(sale=>{
      (sale?.items || []).forEach(item=>{
        const key = String(item?.productId || item?.id || item?.sku || item?.name || '');
        const qty = Number(item?.qty || item?.quantity || 0) || 0;
        topSellingMap.set(key, (topSellingMap.get(key) || 0) + qty);
      });
    });
    const featuredSorted = sortFeaturedForStore(featured, topSellingMap);
    const topSelling = featuredSorted.filter(item=>Number(topSellingMap.get(String(item.id)) || 0) > 0).slice(0,4);
    const newestProducts = featuredSorted.filter(item=>!topSelling.some(top=>String(top.id)===String(item.id))).slice(0,4);
    const categories = getAllCategories(featuredSorted);
    const heroStyle = page.heroImage ? `background-image:url('${page.heroImage.replace(/'/g,"%27")}')` : '';
    const secondaryStyle = page.secondaryImage ? `background-image:url('${page.secondaryImage.replace(/'/g,"%27")}')` : '';
    const initials = (biz.name || 'DG').split(' ').slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
    const contactPhone = page.phone || biz.phone || '';
    const facebookUrl = safeUrl(page.facebook || '');
    const instagramUrl = safeUrl(page.instagram || '');
    const mapsUrl = safeUrl(page.mapsUrl || '');
    target.innerHTML = `
      <div class="pwTopBar">
        <span>${safeText(page.trustText || '')}</span>
        <div class="pwTopBarLinks">${contactPhone ? `<a href="tel:${safeText(contactPhone)}">${safeText(contactPhone)}</a>` : ''}<a href="${waLink('Hola, quiero información del gym.') }" target="_blank" rel="noopener">WhatsApp</a></div>
      </div>
      <div class="pwHero">
        <div class="pwHeroGrid">
          <div class="pwHeroCopy">
            <div class="pwBadge">Página V24.6</div>
            <div class="pwBrand">
              <div class="pwBrandLogo">${biz.logoDataUrl ? `<img src="${biz.logoDataUrl}" alt="logo">` : initials}</div>
              <div>
                <strong>${safeText(biz.name || 'Dinamita Gym')}</strong><br>
                <small class="muted">${safeText(page.tagline || '')}</small>
              </div>
            </div>
            <h2>${safeText(page.title || '')}</h2>
            <p>${safeText(page.subtitle || '')}</p>
            <div class="pwHeroActions">
              <a class="pwPrimaryBtn" href="${waLink('Hola, quiero información del gym y sus promociones.') }" target="_blank" rel="noopener">${safeText(page.ctaText || 'Escríbenos')}</a>
              <a class="pwSecondaryBtn" href="#pw-promos-preview">${safeText(page.ctaSecondary || 'Ver promociones')}</a>
            </div>
            <div class="pwTrustRow">
              <div class="pwStat"><strong>${memberships.length}</strong><span>membresías visibles</span></div>
              <div class="pwStat"><strong>${featured.length}</strong><span>productos destacados</span></div>
              <div class="pwStat"><strong>24/7</strong><span>contacto por WhatsApp</span></div>
            </div>
          </div>
          <div class="pwHeroVisual">
            <div class="pwHeroMedia" style="${heroStyle}"></div>
            <div class="pwPromoBanner" style="${secondaryStyle}">
              <div>
                <small>Promoción activa</small>
                <strong>${safeText(promos[0] || 'Activa tus promociones en este módulo')}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section class="pwSection">
        <div class="pwSectionHead"><h3>Ofertas de la semana</h3><span class="muted">Empuja tus promociones y productos estrella</span></div>
        <div class="pwOfferGrid">
          ${featured.slice(0,3).length ? featured.slice(0,3).map((item,idx)=>`<article class="pwOfferCard"><small>${idx===0?'Oferta principal':'Destacado'}</small><strong>${safeText(item.name)}</strong><span>${dpFmtMoney(item.price || 0)}</span><a class="pwGhostBtn" href="${waLink(productWaText(item)) }" target="_blank" rel="noopener">Pedir por WhatsApp</a></article>`).join('') : '<div class="pwEmpty">Agrega productos destacados para crear ofertas.</div>'}
        </div>
      </section>

      <section class="pwSection">
        <div class="pwSectionHead"><h3>Marcas destacadas</h3><span class="muted">Base comercial para suplementos y accesorios</span></div>
        <div class="pwBrandStrip">
          ${getHighlightedBrands(featured).length ? getHighlightedBrands(featured).map(brand=>`<span class="pwBrandChip">${safeText(brand)}</span>`).join('') : '<div class="pwEmpty">Agrega productos con marca o categoría para resaltarlas aquí.</div>'}
        </div>
      </section>

      <section class="pwSection">
        <div class="pwSectionHead"><h3>Lo más vendido</h3><span class="muted">Lo que más se está moviendo en tu gimnasio</span></div>
        <div class="pwStoreGrid pwStoreGrid--top">
          ${topSelling.length ? topSelling.map(item=>`<article class="pwStoreCard"><div class="pwStoreBadge">Más vendido</div>${productCard(item)}</article>`).join('') : '<div class="pwEmpty">Todavía no hay suficiente historial para calcular lo más vendido.</div>'}
        </div>
      </section>

      <section class="pwSection">
        <div class="pwSectionHead"><h3>Productos destacados</h3><span class="muted">Selección principal para empujar ventas</span></div>
        <div class="pwStoreGrid pwStoreGrid--featured">
          ${featuredSorted.length ? featuredSorted.slice(0,4).map(item=>`<article class="pwStoreCard pwStoreCard--featured">${productCard(item)}</article>`).join('') : '<div class="pwEmpty">Selecciona productos destacados para la página.</div>'}
        </div>
      </section>

      <section class="pwSection">
        <div class="pwSectionHead"><h3>Nuevos ingresos</h3><span class="muted">Perfecto para que el cliente vea novedades rápido</span></div>
        <div class="pwStoreGrid pwStoreGrid--new">
          ${newestProducts.length ? newestProducts.map(item=>`<article class="pwStoreCard"><div class="pwStoreBadge pwStoreBadge--new">Nuevo</div>${productCard(item)}</article>`).join('') : '<div class="pwEmpty">No hay nuevos ingresos configurados todavía.</div>'}
        </div>
      </section>

      <section class="pwSection">
        <div class="pwSectionHead"><h3>Catálogo del gym</h3><span class="muted">Busca, filtra y navega por categoría como si fueran mini páginas</span></div>
        <div class="pwCatalogPageLabel" id="pw-catalog-page-label">Vista actual: Todo</div>
        ${buildCatalogToolbar(featuredSorted)}
        <div class="pwGrid pwGrid--memberships">
          ${memberships.length ? memberships.map(item=>`
            <div class="pwMiniCard pwMiniCard--membership" data-membership-card data-name="${safeText(item.name)}">
              <div class="pwMiniTag">${Number(item.days||0)} días</div>
              <strong>${safeText(item.name)}</strong>
              <div class="price">${dpFmtMoney(item.price || 0)}</div>
              <div class="pwProductActions"><a class="pwGhostBtn" href="${waLink(membershipWaText(item)) }" target="_blank" rel="noopener">Solicitar info</a><button class="pwPrimaryBtn pwPrimaryBtn--small" type="button" data-add-cart="membership:${item.id}">Agregar</button></div>
            </div>`).join('') : ''}
        </div>
        <div class="pwProductGrid">
          ${featuredSorted.length ? featuredSorted.map(item=>`<div data-product-card data-name="${safeText(item.name)}" data-category="${normalizeCategory(item)}">${productCard(item)}</div>`).join('') : '<div class="pwEmpty">Selecciona productos destacados para la página.</div>'}
        </div>
        <div class="pwEmpty" id="pw-catalog-empty" hidden>No hay resultados con ese filtro.</div>
      </section>

      <section class="pwSection" id="pw-catalog-home">
        <div class="pwSectionHead"><h3>Categorías del catálogo</h3><span class="muted">Cada categoría te lleva a su propia vista con todos los productos</span></div>
        <div class="pwCategoryLanding">
          ${categories.length ? categories.map(cat=>{
            const items = featuredSorted.filter(item => normalizeCategory(item) === cat);
            const slug = slugifyCategory(cat);
            return `
            <a class="pwCategoryLandingCard" href="#cat-${slug}">
              <div>
                <small class="muted">Categoría</small>
                <strong>${safeText(cat)}</strong>
              </div>
              <span>${items.length} producto${items.length===1?'':'s'}</span>
            </a>`;
          }).join('') : '<div class="pwEmpty">No hay productos suficientes para agrupar por categoría.</div>'}
        </div>
      </section>

      ${buildCategorySections(featuredSorted)}

      <section id="pw-promos-preview" class="pwSection">
        <div class="pwSectionHead"><h3>Promociones</h3><span class="muted">Ideal para campañas y flyers</span></div>
        <div class="pwPromoList pwPromoList--cards">
          ${promos.length ? promos.map((text,idx)=>`<div class="pwPromoItem"><small>Promo ${idx+1}</small><strong>${safeText(text)}</strong></div>`).join('') : '<div class="pwEmpty">Aún no hay promociones activas.</div>'}
        </div>
      </section>



      <div id="pw-product-modal" class="pwModal" hidden>
        <div class="pwModalBackdrop" data-close-product-modal></div>
        <div class="pwModalCard">
          <button class="pwModalClose" type="button" data-close-product-modal>&times;</button>
          <div id="pw-product-modal-content"></div>
        </div>
      </div>

      
      <button class="pwCartFloat" id="pw-cart-open" type="button">🛒 Carrito <span id="pw-cart-count">0</span></button>
      <div id="pw-cart-modal" class="pwModal" hidden>
        <div class="pwModalBackdrop" data-close-cart></div>
        <div class="pwModalCard pwModalCard--cart">
          <button class="pwModalClose" type="button" data-close-cart>&times;</button>
          <div class="pwCartHead">
            <div>
              <strong>Carrito de compra</strong>
              <div class="muted">Arma tu pedido y envíalo por WhatsApp</div>
            </div>
            <button class="pwGhostBtn" type="button" id="pw-cart-clear">Vaciar</button>
          </div>
          <div id="pw-cart-empty" class="pwEmpty">Tu carrito está vacío.</div>
          <div id="pw-cart-items" class="pwCartList"></div>
          <div class="pwCartSummary">
            <div><span>Total</span><strong id="pw-cart-total-value">$0.00</strong></div>
            <a id="pw-cart-send" class="pwPrimaryBtn is-disabled" href="#" target="_blank" rel="noopener">Enviar pedido por WhatsApp</a>
          </div>
        </div>
      </div>

      <section class="pwContact">
        <div class="pwContactInfo">
          <strong>Contacto</strong>
          <div>${safeText(page.address || biz.address || 'Agrega la dirección del gym.')}</div>
          <div>${safeText(contactPhone || 'Agrega tu teléfono visible.')}</div>
          <div class="pwContactLinks">
            <a class="pwGhostBtn" href="${waLink('Hola, quiero información para entrenar o comprar productos.') }" target="_blank" rel="noopener">WhatsApp</a>
            ${mapsUrl ? `<a class="pwGhostBtn" href="${mapsUrl}" target="_blank" rel="noopener">Cómo llegar</a>` : ''}
            ${facebookUrl ? `<a class="pwGhostBtn" href="${facebookUrl}" target="_blank" rel="noopener">Facebook</a>` : ''}
            ${instagramUrl ? `<a class="pwGhostBtn" href="${instagramUrl}" target="_blank" rel="noopener">Instagram</a>` : ''}
          </div>
          ${(facebookUrl || instagramUrl) ? `<div class="pwSocialHandles">${facebookUrl ? `<span>${safeText(socialLabel(facebookUrl))}</span>` : ''}${instagramUrl ? `<span>${safeText(socialLabel(instagramUrl))}</span>` : ''}</div>` : ''}
        </div>
        <a class="pwPrimaryBtn" href="${waLink('Hola, quiero información para entrenar o comprar productos.') }" target="_blank" rel="noopener">${safeText(page.ctaText || 'Escríbenos')}</a>
      </section>
      <a class="pwWhatsFloat" href="${waLink('Hola, quiero información del gym y sus productos.') }" target="_blank" rel="noopener" aria-label="WhatsApp">WhatsApp</a>
    `;
    bindPreviewInteractions(featured);
    initCatalogInteractions(target);
  }

  function openProductDetail(productId){
    const item = products.find(x=> String(x.id) === String(productId));
    const modal = $('pw-product-modal');
    const content = $('pw-product-modal-content');
    if(!item || !modal || !content) return;
    const img = getProductImage(item);
    content.innerHTML = `
      <div class="pwDetailGrid">
        <div class="pwDetailMedia">${img ? `<img src="${img}" alt="${safeText(item.name)}">` : `<div class="pwProductPlaceholder pwProductPlaceholder--large">${productFallback(item)}</div>`}</div>
        <div class="pwDetailBody">
          <span class="pwChip">${normalizeCategory(item)}</span>
          <h3>${safeText(item.name)}</h3>
          <div class="pwProductPrice">${dpFmtMoney(item.price || 0)}</div>
          <p class="muted">Producto destacado de tu catálogo web. Ideal para compartir por WhatsApp.</p>
          <div class="pwProductActions">
            <a class="pwPrimaryBtn" href="${waLink(productWaText(item))}" target="_blank" rel="noopener">Comprar por WhatsApp</a>
            <button class="pwGhostBtn" type="button" data-close-product-modal>Cerrar</button>
          </div>
        </div>
      </div>`;
    modal.hidden = false;
    document.body.classList.add('pwModalOpen');
    modal.querySelectorAll('[data-close-product-modal]').forEach(btn=>btn.onclick = closeProductDetail);
  }

  function closeProductDetail(){
    const modal = $('pw-product-modal');
    if(!modal) return;
    modal.hidden = true;
    document.body.classList.remove('pwModalOpen');
  }

  function bindPreviewInteractions(featuredItems){
    document.querySelectorAll('[data-product-detail]').forEach(btn=>{
      btn.onclick = ()=> openProductDetail(btn.getAttribute('data-product-detail'));
    });
    document.querySelectorAll('[data-close-product-modal]').forEach(btn=>{
      btn.onclick = closeProductDetail;
    });
    document.querySelectorAll('[data-add-cart]').forEach(btn=>{
      btn.onclick = ()=> {
        const [kind,id] = String(btn.getAttribute('data-add-cart') || '').split(':');
        if(kind && id) addToCart(kind, id);
      };
    });
    $('pw-cart-open')?.addEventListener('click', openCart);
    $('pw-cart-clear')?.addEventListener('click', clearCart);
    document.querySelectorAll('[data-close-cart]').forEach(btn=> btn.onclick = closeCart);
    $('pw-cart-send')?.addEventListener('click', (e)=>{
      if(!previewCart.length){ e.preventDefault(); return; }
    });
    renderCart();
  }

  function bindInputs(){
    const map = {
      'pw-title':'title',
      'pw-subtitle':'subtitle',
      'pw-tagline':'tagline',
      'pw-whatsapp':'whatsapp',
      'pw-cta':'ctaText',
      'pw-ctaSecondary':'ctaSecondary',
      'pw-trust':'trustText',
      'pw-address':'address',
      'pw-phone':'phone',
      'pw-facebook':'facebook',
      'pw-instagram':'instagram',
      'pw-maps':'mapsUrl'
    };
    Object.entries(map).forEach(([id,key])=>{
      const el = $(id);
      if(!el) return;
      el.addEventListener('input', ()=>{ page[key] = el.value; renderPreview(); });
    });
    const heroInput = $('pw-heroImage');
    heroInput?.addEventListener('change', async ()=>{
      const file = heroInput.files?.[0];
      if(!file) return;
      try{
        page.heroImage = await readFileAsDataURL(file);
        setImagePreview('pw-heroImagePreview', page.heroImage);
        renderPreview();
      }catch(err){
        alert(err.message || 'No se pudo cargar la imagen principal');
      }
    });

    const secondaryInput = $('pw-secondaryImage');
    secondaryInput?.addEventListener('change', async ()=>{
      const file = secondaryInput.files?.[0];
      if(!file) return;
      try{
        page.secondaryImage = await readFileAsDataURL(file);
        setImagePreview('pw-secondaryImagePreview', page.secondaryImage);
        renderPreview();
      }catch(err){
        alert(err.message || 'No se pudo cargar la imagen secundaria');
      }
    });

    ['pw-promo1','pw-promo2','pw-promo3'].forEach((id,idx)=>{
      const el = $(id);
      if(!el) return;
      el.addEventListener('input', ()=>{ page.promos[idx] = el.value; renderPreview(); });
    });
    $('pw-productSearch')?.addEventListener('input', renderProducts);
  }

  function fill(){
    setVal('pw-title', page.title);
    setVal('pw-subtitle', page.subtitle);
    setVal('pw-tagline', page.tagline);
    setVal('pw-whatsapp', page.whatsapp);
    setVal('pw-cta', page.ctaText);
    setVal('pw-ctaSecondary', page.ctaSecondary);
    setVal('pw-trust', page.trustText);
    setVal('pw-address', page.address);
    setVal('pw-phone', page.phone || '');
    setVal('pw-facebook', page.facebook || '');
    setVal('pw-instagram', page.instagram || '');
    setVal('pw-maps', page.mapsUrl || '');
    setImagePreview('pw-heroImagePreview', page.heroImage);
    setImagePreview('pw-secondaryImagePreview', page.secondaryImage);
    setVal('pw-promo1', page.promos[0] || '');
    setVal('pw-promo2', page.promos[1] || '');
    setVal('pw-promo3', page.promos[2] || '');
    renderMemberships();
    renderProducts();
    renderPreview();
  }


  function buildDownloadHtml(){
    const visibleMemberships = catalog.filter(x=>page.membershipsVisible.includes(x.id));
    const featured = products.filter(x=>page.featuredProducts.includes(x.id)).slice(0,120);
    const promos = (page.promos||[]).filter(Boolean);
    const sales = Array.isArray(state?.sales) ? state.sales : [];
    const topSellingMap = new Map();
    sales.forEach(sale=>{
      (sale?.items || []).forEach(item=>{
        const key = String(item?.productId || item?.id || item?.sku || item?.name || '');
        const qty = Number(item?.qty || item?.quantity || 0) || 0;
        topSellingMap.set(key, (topSellingMap.get(key) || 0) + qty);
      });
    });
    const featuredSorted = sortFeaturedForStore(featured, topSellingMap);
    const newestProducts = featuredSorted.filter(item=>Number(topSellingMap.get(String(item.id)) || 0) <= 0).slice(0,4);
    const categories = getAllCategories(featuredSorted);
    const topSelling = featuredSorted
      .filter(item=>Number(topSellingMap.get(String(item.id)) || 0) > 0)
      .slice(0,4)
      .map(item=>({ item, sold: Number(topSellingMap.get(String(item.id)) || 0) }));
    const brands = getHighlightedBrands(featuredSorted);
    const filters = getFeaturedCategories(featuredSorted);
    const title = safeText(page.title || 'Dinamita Gym');
    const bizName = safeText(biz.name || 'Dinamita Gym');
    const contactPhone = page.phone || biz.phone || '';
    const facebookUrl = safeUrl(page.facebook || '');
    const instagramUrl = safeUrl(page.instagram || '');
    const mapsUrl = safeUrl(page.mapsUrl || '');
    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} | ${bizName}</title>
<style>body{margin:0;font-family:Arial,sans-serif;background:#fff;color:#111}a{text-decoration:none} .wrap{max-width:1120px;margin:0 auto;padding:0 16px} .top{background:#111;color:#fff;padding:10px 0;font-size:14px}.top .wrap{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.hero{padding:28px 0;background:linear-gradient(135deg,#fff,#f6f6f6)}.hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:18px;align-items:center}.brand{display:flex;align-items:center;gap:12px;margin-bottom:10px}.logo{width:64px;height:64px;border-radius:18px;background:#fff;border:1px solid #eee;display:flex;align-items:center;justify-content:center;overflow:hidden;color:#c00000;font-weight:800}.logo img{width:100%;height:100%;object-fit:contain}.badge{display:inline-block;padding:6px 10px;border-radius:999px;background:#fff1f1;color:#c00000;font-size:12px;font-weight:700;margin-bottom:10px}h1{margin:0 0 8px;font-size:34px;line-height:1.05}p{color:#444}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.btn{display:inline-flex;align-items:center;justify-content:center;padding:12px 16px;border-radius:12px;font-weight:700}.btn-primary{background:#c00000;color:#fff}.btn-secondary{background:#fff;border:1px solid #ececec;color:#222}.btn-ghost{background:#fff;border:1px solid #ececec;color:#222}.visual-main{height:280px;border-radius:24px;background:#f2f2f2 center/cover no-repeat;border:1px solid #eee;box-shadow:0 16px 32px rgba(0,0,0,.08)}.visual-promo{margin-top:12px;min-height:100px;border-radius:20px;background:#222 center/cover no-repeat;color:#fff;padding:16px;display:flex;align-items:flex-end}.section{padding:24px 0}.head{display:flex;justify-content:space-between;gap:10px;align-items:flex-end;margin-bottom:14px;flex-wrap:wrap}.head h2{margin:0;font-size:22px}.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.card{border:1px solid #ececec;border-radius:18px;background:#fff;padding:14px}.price{font-weight:800;color:#c00000;font-size:18px}.chip{display:inline-flex;padding:5px 9px;border-radius:999px;background:#fff5f5;color:#c00000;font-size:11px;font-weight:800;width:max-content}.product{display:grid;grid-template-columns:118px 1fr;gap:12px;border:1px solid #ececec;border-radius:18px;padding:12px}.media{height:118px;border-radius:14px;background:#f7f7f7;overflow:hidden;border:1px solid #eee;display:flex;align-items:center;justify-content:center}.media img{width:100%;height:100%;object-fit:cover}.promos{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.promo{padding:14px;border-radius:18px;background:#fff5f5;border:1px solid #ffd6d6}.cats{display:flex;gap:8px;flex-wrap:wrap}.cats .chip{background:#f5f5f5;color:#555}.mini-list{display:grid;gap:8px}.mini-item{display:flex;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:14px;background:#fafafa;border:1px solid #eee}.contact{padding:20px 0 30px;border-top:1px solid #eee;background:#fafafa}.contact-links{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.social-handles{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;color:#666;font-size:13px} .category-landing{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.category-card{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:14px;border-radius:18px;background:#fafafa;border:1px solid #eee;color:#111}.category-page{padding-top:12px}.topgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.topcard{border:1px solid #ececec;border-radius:18px;overflow:hidden;background:#fff}.topcard .media{height:150px;border:none;border-bottom:1px solid #eee;border-radius:0}.topbody{padding:12px;display:grid;gap:6px}.wa-float{position:fixed;right:18px;bottom:18px;background:#1fa855;color:#fff;padding:14px 18px;border-radius:999px;font-weight:800;box-shadow:0 14px 28px rgba(0,0,0,.18)}@media (max-width:900px){.hero-grid,.grid3,.grid2,.promos,.topgrid{grid-template-columns:1fr}.product{grid-template-columns:1fr}}</style>
</head>
<body>
<div class="top"><div class="wrap"><div>${safeText(page.address || biz.address || '')}</div><div>${safeText(contactPhone || '')}</div></div></div>
<section class="hero"><div class="wrap hero-grid"><div><span class="badge">Página oficial</span><div class="brand"><div class="logo">${biz.logoDataUrl ? `<img src="${biz.logoDataUrl}" alt="logo">` : bizName.slice(0,2).toUpperCase()}</div><div><strong>${bizName}</strong><div style="color:#666;font-size:14px">${safeText(page.tagline || '')}</div></div></div><h1>${title}</h1><p>${safeText(page.subtitle || '')}</p><div class="actions"><a class="btn btn-primary" href="${waLink('Hola, quiero información para entrenar o comprar productos.')}" target="_blank">${safeText(page.ctaText || 'Escríbenos por WhatsApp')}</a><a class="btn btn-secondary" href="#promociones">${safeText(page.ctaSecondary || 'Ver promociones')}</a></div></div><div><div class="visual-main" style="background-image:url('${page.heroImage||''}')"></div><div class="visual-promo" style="background-image:url('${page.secondaryImage||''}')"><div><small>Promo destacada</small><div>${safeText(promos[0] || 'Tu promoción especial aquí')}</div></div></div></div></div></section>
<section class="section"><div class="wrap"><div class="head"><h2>Membresías</h2></div><div class="grid3">${visibleMemberships.map(item=>`<article class="card" data-membership-card data-name="${safeText(item.name)}"><span class="chip">${Number(item.days||0)} días</span><h3>${safeText(item.name)}</h3><div class="price">${dpFmtMoney(item.price||0)}</div><div class="actions"><button type="button" class="btn btn-secondary" data-wa-message="${safeText(membershipWaText(item))}">Me interesa</button><button type="button" class="btn btn-primary" data-add-cart="membership:${item.id}" data-item-name="${safeText(item.name)}" data-item-price="${Number(item.price||0)||0}" data-item-meta="${safeText(Number(item.days||0)+' días')}">Agregar</button></div></article>`).join('') || '<div class="card">Sin membresías visibles.</div>'}</div></div></section>
<section class="section"><div class="wrap"><div class="head"><h2>Lo más vendido</h2></div><div class="topgrid">${topSelling.map(({item,sold})=>`<article class="topcard"><div class="media">${getProductImage(item)?`<img src="${getProductImage(item)}" alt="${safeText(item.name)}">`:'IMG'}</div><div class="topbody"><span class="chip">Top venta</span><strong>${safeText(item.name)}</strong><small>${sold} piezas vendidas</small><div class="price">${dpFmtMoney(item.price||0)}</div></div></article>`).join('') || '<div class="card">Sin historial suficiente.</div>'}</div></div></section>
<section class="section"><div class="wrap"><div class="head"><h2>Categorías</h2><small>Entra a una vista completa por categoría</small></div><div class="category-landing">${categories.map(cat=>{const slug=slugifyCategory(cat);const count=featuredSorted.filter(item=>normalizeCategory(item)===cat).length;return `<a class="category-card" href="#cat-${slug}"><div><small>Categoría</small><strong>${safeText(cat)}</strong></div><span>${count} producto${count===1?'':'s'}</span></a>`;}).join('') || '<span class="chip">Sin categorías</span>'}</div></div></section>
<section id="catalogo" class="section"><div class="wrap"><div class="head"><h2>Productos destacados</h2><small>Selección principal del catálogo</small></div><div class="grid2">${featuredSorted.slice(0,4).map(item=>`<article class="product" data-product-card data-name="${safeText(item.name)}" data-category="${normalizeCategory(item)}"><div class="media">${getProductImage(item)?`<img src="${getProductImage(item)}" alt="${safeText(item.name)}">`:productFallback(item)}</div><div><span class="chip">${normalizeCategory(item)}</span><h3>${safeText(item.name)}</h3><div class="price">${dpFmtMoney(item.price||0)}</div><div class="actions"><button type="button" class="btn btn-secondary" data-wa-message="${safeText(productWaText(item))}">Comprar por WhatsApp</button><button type="button" class="btn btn-primary" data-add-cart="product:${item.id}" data-item-name="${safeText(item.name)}" data-item-price="${Number(item.price||0)||0}" data-item-meta="${normalizeCategory(item)}">Agregar</button></div></div></article>`).join('') || '<div class="card">Sin productos destacados.</div>'}</div></div></section>
<section class="section"><div class="wrap"><div class="head"><h2>Nuevos ingresos</h2><small>Novedades y productos listos para mover</small></div><div class="topgrid">${newestProducts.map(item=>`<article class="topcard"><div class="media">${getProductImage(item)?`<img src="${getProductImage(item)}" alt="${safeText(item.name)}">`:'IMG'}</div><div class="topbody"><span class="chip">Nuevo</span><strong>${safeText(item.name)}</strong><small>${safeText(normalizeCategory(item))}</small><div class="price">${dpFmtMoney(item.price||0)}</div></div></article>`).join('') || '<div class="card">Sin productos nuevos.</div>'}</div></div></section>
${categories.map(cat=>{const slug=slugifyCategory(cat);const items=featuredSorted.filter(item=>normalizeCategory(item)===cat);return `<section id="cat-${slug}" class="section category-page"><div class="wrap"><div class="head"><h2>${safeText(cat)}</h2><a class="btn btn-ghost" href="#catalogo">Volver al catálogo</a></div><div class="grid2">${items.map(item=>`<article class="product" data-product-card data-name="${safeText(item.name)}" data-category="${normalizeCategory(item)}"><div class="media">${getProductImage(item)?`<img src="${getProductImage(item)}" alt="${safeText(item.name)}">`:productFallback(item)}</div><div><span class="chip">${normalizeCategory(item)}</span><h3>${safeText(item.name)}</h3><div class="price">${dpFmtMoney(item.price||0)}</div><div class="actions"><button type="button" class="btn btn-secondary" data-wa-message="${safeText(productWaText(item))}">Comprar por WhatsApp</button><button type="button" class="btn btn-primary" data-add-cart="product:${item.id}" data-item-name="${safeText(item.name)}" data-item-price="${Number(item.price||0)||0}" data-item-meta="${normalizeCategory(item)}">Agregar</button></div></div></article>`).join('')}</div></div></section>`;}).join('') || '<div class="card">Sin categorías.</div>'}
<section class="section" id="promociones"><div class="wrap"><div class="head"><h2>Promociones</h2></div><div class="promos">${promos.map((text,idx)=>`<article class="promo"><small>Promo ${idx+1}</small><strong>${safeText(text)}</strong></article>`).join('') || '<div class="card">Sin promociones.</div>'}</div></div></section>
<button class="wa-float" type="button" data-wa-message="Hola, quiero información del gym y sus productos.">WhatsApp</button>
<button class="cart-float" id="cart-open" type="button">🛒 Carrito <span id="cart-count">0</span></button>
<div id="cart-modal" class="cart-modal" hidden><div class="cart-backdrop" data-close-cart></div><div class="cart-card"><button class="btn btn-ghost" type="button" data-close-cart>Cerrar</button><h3>Carrito de compra</h3><div id="cart-empty" class="card">Tu carrito está vacío.</div><div id="cart-items" class="mini-list"></div><div class="card" style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><div><strong>Total</strong><div id="cart-total">$0.00</div></div><div class="actions"><button id="cart-clear" type="button" class="btn btn-ghost">Vaciar</button><button id="cart-send" type="button" class="btn btn-primary">Enviar pedido por WhatsApp</button></div></div></div></div>
<section class="contact"><div class="wrap" style="display:flex;justify-content:space-between;gap:16px;align-items:center;flex-wrap:wrap"><div><strong>Contacto</strong><div>${safeText(page.address || biz.address || '')}</div><div>${safeText(contactPhone || '')}</div><div class="contact-links"><button class="btn btn-ghost" type="button" data-wa-message="Hola, quiero información para entrenar o comprar productos.">WhatsApp</button>${mapsUrl ? `<a class="btn btn-ghost" href="${mapsUrl}" target="_blank">Cómo llegar</a>` : ''}${facebookUrl ? `<a class="btn btn-ghost" href="${facebookUrl}" target="_blank">Facebook</a>` : ''}${instagramUrl ? `<a class="btn btn-ghost" href="${instagramUrl}" target="_blank">Instagram</a>` : ''}</div>${(facebookUrl || instagramUrl) ? `<div class="social-handles">${facebookUrl ? `<span>${safeText(socialLabel(facebookUrl))}</span>` : ''}${instagramUrl ? `<span>${safeText(socialLabel(instagramUrl))}</span>` : ''}</div>` : ''}</div><button class="btn btn-primary" type="button" data-wa-message="Hola, quiero información para entrenar o comprar productos.">${safeText(page.ctaText || 'Escríbenos')}</button></div></section>
<script>(function(){
const rawPhone = ${JSON.stringify(page.whatsapp || page.phone || biz.phone || '')};
function normalizePhone(raw){ let num=String(raw||'').replace(/\D+/g,''); if(!num) return ''; if(num.length===10) num='521'+num; else if(num.length===12 && num.startsWith('52')) num='521'+num.slice(2); return num; }
const phone = normalizePhone(rawPhone);
function openWA(message){ if(!phone){ alert('Configura un teléfono o WhatsApp válido en la página.'); return; } const url='https://api.whatsapp.com/send?phone='+phone+'&text='+encodeURIComponent(message||'Hola'); window.open(url,'_blank','noopener,noreferrer'); }
const search=document.getElementById('catalog-search');
const chips=[].slice.call(document.querySelectorAll('[data-filter]'));
const products=[].slice.call(document.querySelectorAll('[data-product-card]'));
const memberships=[].slice.call(document.querySelectorAll('[data-membership-card]'));
let currentFilter='Todo';
function apply(){ const q=(search && search.value ? search.value : '').trim().toLowerCase(); products.forEach(function(card){ const name=(card.dataset.name||'').toLowerCase(); const cat=(card.dataset.category||''); const show=(currentFilter==='Todo'||currentFilter===cat)&&(!q||name.includes(q)||cat.toLowerCase().includes(q)); card.style.display=show?'':'none'; }); memberships.forEach(function(card){ const name=(card.dataset.name||'').toLowerCase(); const show=(currentFilter==='Todo'||currentFilter==='Membresías')&&(!q||name.includes(q)); card.style.display=show?'':'none'; }); }
if(search) search.addEventListener('input',apply);
chips.forEach(function(chip){ chip.addEventListener('click',function(){ currentFilter=chip.dataset.filter||'Todo'; chips.forEach(function(x){ x.classList.toggle('active', x===chip); }); apply(); }); });
apply();
document.querySelectorAll('[data-wa-message]').forEach(function(btn){ btn.addEventListener('click',function(e){ e.preventDefault(); openWA(btn.dataset.waMessage||'Hola'); }); });
var cart=[];
function money(n){ return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(n||0)); }
function totals(){ return cart.reduce(function(acc,it){ acc.count+=it.qty; acc.total+=it.qty*it.price; return acc; }, {count:0,total:0}); }
function renderCart(){ var countEl=document.getElementById('cart-count'); var itemsEl=document.getElementById('cart-items'); var emptyEl=document.getElementById('cart-empty'); var totalEl=document.getElementById('cart-total'); var t=totals(); if(countEl) countEl.textContent=String(t.count); if(totalEl) totalEl.textContent=money(t.total); if(itemsEl){ itemsEl.innerHTML=cart.map(function(it){ return '<div class="mini-item"><div><strong>'+it.name+'</strong><div style="color:#666;font-size:12px">'+(it.meta||'')+'</div></div><div style="display:grid;gap:6px;justify-items:end"><div>'+money(it.qty*it.price)+'</div><div class="actions"><button type="button" class="btn btn-ghost cart-dec" data-key="'+it.key+'">-</button><span>'+it.qty+'</span><button type="button" class="btn btn-ghost cart-inc" data-key="'+it.key+'">+</button></div></div></div>'; }).join(''); itemsEl.querySelectorAll('.cart-inc').forEach(function(b){ b.onclick=function(){ changeQty(b.dataset.key,1); }; }); itemsEl.querySelectorAll('.cart-dec').forEach(function(b){ b.onclick=function(){ changeQty(b.dataset.key,-1); }; }); } if(emptyEl) emptyEl.style.display=cart.length?'none':''; }
function addToCart(btn){ var key=btn.dataset.addCart; var existing=cart.find(function(x){ return x.key===key; }); if(existing){ existing.qty+=1; } else { cart.push({ key:key, name:btn.dataset.itemName||'Producto', price:Number(btn.dataset.itemPrice||0)||0, meta:btn.dataset.itemMeta||'', qty:1 }); } renderCart(); }
function changeQty(key,delta){ var item=cart.find(function(x){ return x.key===key; }); if(!item) return; item.qty+=delta; if(item.qty<=0){ cart=cart.filter(function(x){ return x.key!==key; }); } renderCart(); }
function clearCart(){ cart=[]; renderCart(); }
function openCart(){ var modal=document.getElementById('cart-modal'); if(modal) modal.hidden=false; }
function closeCart(){ var modal=document.getElementById('cart-modal'); if(modal) modal.hidden=true; }
document.querySelectorAll('[data-add-cart]').forEach(function(btn){ btn.addEventListener('click',function(){ addToCart(btn); }); });
document.getElementById('cart-open') && document.getElementById('cart-open').addEventListener('click',openCart);
document.querySelectorAll('[data-close-cart]').forEach(function(btn){ btn.addEventListener('click',closeCart); });
document.getElementById('cart-clear') && document.getElementById('cart-clear').addEventListener('click',clearCart);
document.getElementById('cart-send') && document.getElementById('cart-send').addEventListener('click',function(){ if(!cart.length) return; var lines=cart.map(function(it){ return '- '+it.name+' x'+it.qty+' '+money(it.qty*it.price); }); openWA('Hola, quiero hacer este pedido:

'+lines.join('\n')+'\n\nTotal: '+money(totals().total)); });
renderCart();
})();</script></body></html>`;
  }

  function downloadCurrentPage(){
    const html = buildDownloadHtml();
    const blob = new Blob([html], { type:'text/html;charset=utf-8' });
    const a = document.createElement('a');
    const bizSlug = String((biz.name || 'dinamita-gym')).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    a.href = URL.createObjectURL(blob);
    a.download = `${bizSlug || 'pagina'}-web.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=> URL.revokeObjectURL(a.href), 1200);
  }

  $('pw-download')?.addEventListener('click', downloadCurrentPage);

  $('pw-save')?.addEventListener('click', ()=>{
    dpSetState(st=>{
      st.config = st.config || {};
      st.config.website = {
        title: page.title,
        subtitle: page.subtitle,
        tagline: page.tagline,
        heroImage: page.heroImage,
        secondaryImage: page.secondaryImage,
        whatsapp: page.whatsapp,
        ctaText: page.ctaText,
        ctaSecondary: page.ctaSecondary,
        trustText: page.trustText,
        address: page.address,
        phone: page.phone,
        facebook: page.facebook,
        instagram: page.instagram,
        mapsUrl: page.mapsUrl,
        membershipsVisible: (page.membershipsVisible || []).slice(),
        featuredProducts: (page.featuredProducts || []).slice(0,120),
        promos: (page.promos || []).slice(0,3)
      };
      return st;
    });
    alert('Página web guardada ✅');
  });

  $('pw-reset')?.addEventListener('click', ()=>{
    if(!confirm('¿Restablecer la configuración de la página web?')) return;
    page = {...defaultPage, promos: defaultPage.promos.slice(), membershipsVisible: defaultPage.membershipsVisible.slice(), featuredProducts: defaultPage.featuredProducts.slice()};
    fill();
  });

  fill();
  bindInputs();
})();
