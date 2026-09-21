// Decorative interactions never read or write business data.
(() => {
  const icons = {
    home:'<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
    wallet:'<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18m-6 4h6v4h-6z"/>',
    chart:'<path d="M4 20V10m6 10V4m6 16v-7m5 7H2"/>',
    receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h3"/>',
    people:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5v2"/>',
    layers:'<path d="m12 3 10 5-10 5L2 8zM2 12l10 5 10-5M2 16l10 5 10-5"/>',
    target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    message:'<path d="M21 11a9 9 0 0 1-9 9H3l2-5a9 9 0 1 1 16-4Z"/><path d="M8 10h8M8 14h5"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    arrow:'<path d="M5 17 19 3M8 3h11v11"/>',
    percent:'<path d="m5 19 14-14"/><circle cx="7" cy="7" r="3"/><circle cx="17" cy="17" r="3"/>',
    camera:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17 7h.01"/>',
    send:'<path d="m22 2-7 20-4-9-9-4zM22 2 11 13"/>',
    phone:'<path d="M6 3H3v4a14 14 0 0 0 14 14h4v-5l-5-2-2 3a12 12 0 0 1-7-7l3-2-2-5Z"/>',
    globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
    pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'
  };
  const icon = name => `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.chart}</svg>`;
  document.querySelectorAll('nav [data-page]').forEach(button => button.insertAdjacentHTML('afterbegin',icon({home:'home',finance:'wallet',analytics:'chart'}[button.dataset.page])));
  document.querySelectorAll('.home-card .hc-icon').forEach((el,i)=>el.innerHTML=icon(i?'chart':'wallet'));
  // Move original nodes into the reference grid; identifiers and listeners stay intact.
  ['2025','2026'].forEach(year => {
    const pane = document.getElementById('analytics-'+year);
    const line = document.getElementById('anLine'+year)?.closest('.card');
    const bars = document.getElementById('anBars'+year)?.closest('.card');
    if(pane && line && bars){
      const row = document.createElement('div'); row.className='reference-chart-grid';
      line.before(row); row.append(line,bars);
    }
    const donut = document.getElementById('anDonut'+year)?.closest('.card');
    const summary = document.getElementById('anSummary'+year);
    if(donut && summary){
      const row = document.createElement('div'); row.className='reference-details-grid';
      donut.before(row); row.append(donut,summary);
    }
  });
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.home-card').forEach(card => {
    card.setAttribute('role', 'button');
    card.tabIndex = 0;
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        card.click();
      }
    });
    card.addEventListener('pointermove', event => {
      if (motion.matches || event.pointerType !== 'mouse') return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--pointer-x', `${event.clientX - rect.left}px`);
      card.style.setProperty('--pointer-y', `${event.clientY - rect.top}px`);
    });
  });
  // Make the existing active state available to assistive technology too.
  const tabs = document.querySelectorAll('.page-tab-btn');
  const sync = () => tabs.forEach(tab => tab.setAttribute('aria-pressed', String(tab.classList.contains('active'))));
  const observer = new MutationObserver(sync);
  tabs.forEach(tab => observer.observe(tab, {attributes:true, attributeFilter:['class']}));
  sync();
  // Keyboard access for the original pointer-driven controls. No new actions.
  const upgrade = root => {
    root.querySelectorAll('.an-lead-icon:not([data-icon-ready])').forEach(el=>{
      const label=el.parentElement.querySelector('.an-lead-name')?.textContent || '';
      const type=/Instagram/.test(label)?'camera':/Telegram/.test(label)?'send':/WhatsApp/.test(label)?'message':/Авито/.test(label)?'grid':/Звонки/.test(label)?'phone':/Сайт/.test(label)?'globe':'pin';
      el.dataset.iconReady='1';el.setAttribute('aria-hidden','true');el.innerHTML=icon(type);
    });
    root.querySelectorAll('.kpi:not([data-icon-ready])').forEach(el => {
      const label=el.querySelector('.kpi-label')?.textContent || '';
      const type=/выруч|бюджет|потрач|расход/i.test(label)?'wallet':/посетител/i.test(label)?'people':/глубин|статей|источник/i.test(label)?'layers':/конверс/i.test(label)?'percent':/чек/i.test(label)?'receipt':/заяв/i.test(label)?'message':/разброс/i.test(label)?'chart':'target';
      el.dataset.iconReady='1'; el.insertAdjacentHTML('afterbegin',`<span class="ui-icon-box" aria-hidden="true">${icon(type)}</span>`);
    });
    root.querySelectorAll('.card-title:not([data-icon-ready])').forEach(el=>{
      el.dataset.iconReady='1'; el.insertAdjacentHTML('beforeend',icon('chart'));
    });
    root.querySelectorAll('.an-month-card-head,.an-month-quicknav-pill:not(.is-missing),.an-lead-card,.heat-cell,.rank-row').forEach(el => {
      if (!el.hasAttribute('onclick') && !el.onclick) return;
      if (el.dataset.keyboardReady) return;
      el.dataset.keyboardReady = '1';
      el.tabIndex = 0;
      el.setAttribute('role','button');
      el.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); el.click(); }
      });
    });
    root.querySelectorAll('.cc-field').forEach(field => {
      const label = field.querySelector('label'), control = field.querySelector('input,select');
      if(label && control?.id) label.htmlFor = control.id;
    });
    root.querySelectorAll('.roadmap-table tbody tr').forEach(row => {
      const name = row.querySelector('.cc-cell-name');
      if(!name) return;
      name.setAttribute('aria-label','Название статьи: '+name.value);
      const months = ['Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
      row.querySelectorAll('input[type=number]').forEach((input,i) => input.setAttribute('aria-label',name.value+' — '+months[i]+', ₽'));
      row.querySelector('.cc-del')?.setAttribute('aria-label','Удалить статью '+name.value);
    });
  };
  upgrade(document);
  let pending = false;
  new MutationObserver(() => {
    if(pending) return;
    pending = true;
    requestAnimationFrame(() => {pending = false;upgrade(document);});
  }).observe(document.body,{childList:true,subtree:true});
})();
