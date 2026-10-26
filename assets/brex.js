// Chart presentation and accessible interactions. Business values and arc geometry stay intact.
(() => {
  const palette=['#f47721','#3479c7','#299d91','#8c64c3','#cf536b','#b58b27','#589d56','#5c69af','#bf783a','#42a2b8','#a25795','#7c8995'];
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const animate=svg=>{
    if(svg.dataset.drawn)return;svg.dataset.drawn='1';
    if(reduced.matches)return;
    svg.querySelectorAll('circle[data-target-dash]').forEach((circle,i)=>{
      const length=2*Math.PI*Number(circle.getAttribute('r'));
      circle.animate([{strokeDasharray:`0 ${length}`},{strokeDasharray:circle.dataset.targetDash}],{duration:850,delay:i*30,easing:'cubic-bezier(.22,1,.36,1)'});
    });
  };
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){animate(entry.target);observer.unobserve(entry.target);}}),{threshold:.25});
  const apply=()=>{
    document.querySelectorAll('.donut-svg').forEach(svg=>{
      if(svg.dataset.colorReady)return;
      const segments=[...svg.querySelectorAll('circle[data-target-dash]')];if(!segments.length)return;
      svg.dataset.colorReady='1';
      const card=svg.closest('.card')||svg.closest('.donut-wrap')?.parentElement;
      const wrap=svg.closest('.donut-wrap');
      const rows=[...(wrap?.querySelectorAll('.rank-list .rank-row')||[])];
      const info=document.createElement('div');info.className='ws-donut-info';info.setAttribute('role','status');info.setAttribute('aria-live','polite');info.textContent='Выбери сектор или строку, чтобы увидеть показатель.';
      wrap?.after(info);card?.classList.add('ws-donut-card');
      let selected=null;
      const show=i=>{info.textContent=segments[i].querySelector('title')?.textContent||'';info.classList.add('is-active');rows.forEach((row,j)=>row.classList.toggle('ws-active',i===j));};
      const clear=()=>{if(selected!==null){show(selected);return;}info.textContent='Выбери сектор или строку, чтобы увидеть показатель.';info.classList.remove('is-active');rows.forEach(row=>row.classList.remove('ws-active'));};
      svg.querySelector('circle:not([data-target-dash])')?.setAttribute('stroke','#eceef2');
      segments.forEach((circle,i)=>{
        const color=palette[i%palette.length];circle.setAttribute('stroke',color);circle.dataset.chartColor=color;
        circle.setAttribute('tabindex','0');circle.setAttribute('role','img');circle.setAttribute('aria-label',circle.querySelector('title')?.textContent||'Сектор диаграммы');
        circle.addEventListener('mouseenter',()=>show(i));circle.addEventListener('mouseleave',clear);circle.addEventListener('click',()=>{selected=i;show(i);});
        circle.addEventListener('focus',()=>{circle.dispatchEvent(new Event('mouseenter'));show(i);});circle.addEventListener('blur',()=>circle.dispatchEvent(new Event('mouseleave')));
        const row=rows[i];if(!row)return;
        row.querySelector('.swatch')?.style.setProperty('background',color);row.style.setProperty('--row-color',color);row.tabIndex=0;row.setAttribute('role','button');row.setAttribute('aria-label',circle.getAttribute('aria-label'));
        row.addEventListener('mouseenter',()=>show(i));row.addEventListener('mouseleave',clear);row.addEventListener('click',()=>{selected=i;show(i);});
        row.addEventListener('focus',()=>{circle.dispatchEvent(new Event('mouseenter'));show(i);});row.addEventListener('blur',()=>circle.dispatchEvent(new Event('mouseleave')));
        row.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();circle.dispatchEvent(new Event('mouseenter'));show(i);}});
      });observer.observe(svg);
    });
    document.querySelectorAll('.an-legend-item').forEach(item=>{const dot=item.querySelector('i');if(dot)dot.style.background=/2026/.test(item.textContent)?'#ff5900':'#60646c';});
    document.querySelectorAll('.an-month-lead-chip i,.an-channel-row i').forEach((el,i)=>{el.style.background=palette[i%palette.length];});
  };
  let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;apply();});}).observe(document.body,{childList:true,subtree:true});apply();
})();
