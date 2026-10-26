// Presentation-only palette mapping: values, labels, geometry and chart handlers stay intact.
(() => {
  const grays=['#15191e','#60646c','#92959f','#c3c5ce','#42464f','#a9acb7','#747985','#d6d8e0','#30353e','#b9bbc6','#8b8d98','#e2e3e9'];
  const apply=()=>{
    document.querySelectorAll('.donut-svg').forEach(svg=>{
      svg.querySelectorAll('circle').forEach((circle,i)=>{if(circle.dataset.brexPaint)return;circle.dataset.brexPaint='1';circle.setAttribute('stroke',grays[i%grays.length]);});
      const card=svg.closest('.card')||svg.closest('.donut-wrap')?.parentElement;
      card?.querySelectorAll('.rank-list .swatch').forEach((swatch,i)=>{swatch.style.background=grays[i%grays.length];});
    });
    document.querySelectorAll('.an-legend-item').forEach(item=>{const dot=item.querySelector('i');if(dot)dot.style.background=/2026/.test(item.textContent)?'#ff5900':'#60646c';});
    document.querySelectorAll('.an-month-lead-chip i,.an-channel-row i').forEach((el,i)=>{el.style.background=grays[i%grays.length];});
  };
  let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;apply();});}).observe(document.body,{childList:true,subtree:true});apply();
})();
