document.addEventListener('DOMContentLoaded', function () {
  const dropdowns = Array.from(document.querySelectorAll('.info-dropdown'));
  const canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let hoverCloseTimeouts = new WeakMap();

  function closeAll() {
    dropdowns.forEach(dd => {
      dd.classList.remove('open');
      const btn = dd.querySelector('.info-btn');
      if (btn) btn.setAttribute('aria-expanded', 'false');
      // restore any hidden elements
      const hidden = dd._hiddenOnOpen;
      if (hidden && hidden.length) {
        hidden.forEach(el => el.classList.remove('dim-on-dropdown'));
        dd._hiddenOnOpen = null;
      }
      // restore any dropdown buttons hidden by another open dropdown
      if (dd._hiddenBtns && dd._hiddenBtns.length) {
        dd._hiddenBtns.forEach(el => el.classList.remove('info-hidden-when-open'));
        dd._hiddenBtns = null;
      }
    });
    document.body.classList.remove('dropdown-open');
  }

  dropdowns.forEach(dd => {
    const btn = dd.querySelector('.info-btn');
    const menu = dd.querySelector('.info-menu');
    if (!btn) return;

    // Mark buttons that control menus
    if (menu && menu.children.length > 0) {
      btn.setAttribute('aria-haspopup', 'true');
      btn.setAttribute('aria-expanded', 'false');

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        const isOpen = dd.classList.contains('open');
        closeAll();
        if (!isOpen) {
          dd.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
          // hide other header dropdown buttons to avoid overlap
          try{
            var others = Array.prototype.slice.call(document.querySelectorAll('.info-dropdown'));
            dd._hiddenBtns = [];
            others.forEach(function(o){ if(o !== dd){ o.classList.add('info-hidden-when-open'); dd._hiddenBtns.push(o); } });
          }catch(err){/* ignore */}
        }
      });

      // after opening, hide overlapping elements to avoid awkward overlap
      function hideOverlapping() {
        try{
          const menuRect = menu.getBoundingClientRect();
          // exclude the main image slider and essential UI so they continue working
          // include other header dropdowns so opening one hides overlapping header buttons/menus
          const candidates = document.querySelectorAll('section, .cards-row, .virus-cards, .hero-section, .graph-item, .timeline-graphs, .card, .btn, .info-dropdown');
          const toHide = [];
          candidates.forEach(el => {
            if (!el || el.contains(menu) || menu.contains(el)) return;
            const r = el.getBoundingClientRect();
            // check vertical and horizontal overlap
            const verticallyOverlap = !(r.bottom < menuRect.top || r.top > menuRect.bottom);
            const horizontallyOverlap = !(r.right < menuRect.left || r.left > menuRect.right);
            if (verticallyOverlap && horizontallyOverlap) {
              el.classList.add('dim-on-dropdown');
              toHide.push(el);
            }
          });
          if (toHide.length) {
            dd._hiddenOnOpen = toHide;
            document.body.classList.add('dropdown-open');
          }
        }catch(e){/* ignore */}
      }

      // observe mutations to detect open state and hide overlaps
      const obs = new MutationObserver(()=>{
        if (dd.classList.contains('open')) hideOverlapping();
        else if (dd._hiddenOnOpen && dd._hiddenOnOpen.length){ dd._hiddenOnOpen.forEach(el=>el.classList.remove('dim-on-dropdown')); dd._hiddenOnOpen=null; document.body.classList.remove('dropdown-open'); }
      });
      obs.observe(dd, { attributes: true, attributeFilter: ['class'] });

      // Hover behavior on capable devices — open on mouseenter, close on mouseleave
      if (canHover) {
        dd.addEventListener('mouseenter', function () {
          // cancel any pending close
          const t = hoverCloseTimeouts.get(dd);
          if (t) { clearTimeout(t); hoverCloseTimeouts.delete(dd); }
          closeAll();
          dd.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
          // hide other header dropdown buttons while this one is open
          try{ var others = Array.prototype.slice.call(document.querySelectorAll('.info-dropdown')); dd._hiddenBtns = []; others.forEach(function(o){ if(o !== dd){ o.classList.add('info-hidden-when-open'); dd._hiddenBtns.push(o); } }); }catch(err){}
        });
        dd.addEventListener('mouseleave', function () {
          // small delay to avoid flicker when moving between menus
          const timeout = setTimeout(()=>{ dd.classList.remove('open'); btn.setAttribute('aria-expanded','false'); }, 220);
          hoverCloseTimeouts.set(dd, timeout);
        });
      }

      // Prevent clicks inside menu from closing (so scroll/clicks don't bubble)
      menu.addEventListener('click', function (e) { e.stopPropagation(); });
      menu.addEventListener('wheel', function (e) { e.stopPropagation(); });
    } else {
      // If no menu, allow normal link behavior
      // no change
    }
  });

  // Close on outside click or Escape
  document.addEventListener('click', function () { closeAll(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
  
  // search toggle handled by `JS/search.js` to avoid duplicate behavior
  
  // Welcome handled by main.js (single, richer popup). Removed duplicate quick popup.
  
  // Draw tiny sparklines in the mini graph canvases inside the timeline cards
  function drawSparkline(id, values, stroke = '#0b63b5') {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0,0,w,h);
    // background subtle
    const grad = ctx.createLinearGradient(0,0,0,h);
    grad.addColorStop(0,'rgba(11,99,181,0.06)');
    grad.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,w,h);

    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    ctx.beginPath();
    values.forEach((v,i) => {
      const x = (i/(values.length-1)) * (w-6) + 3;
      const y = h - 4 - ((v - min) / range) * (h-8);
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const sampleSeries = {
    'mini-covid':[2,4,6,8,7,6,8,9],
    'mini-influenza':[3,3,4,5,4,3,4,3],
    'mini-dengue':[1,2,3,2,4,3,2,1],
    'mini-smallpox':[1,1,1,1,1,1,1,1],
    'mini-rabies':[1,1,2,1,1,1,2,1],
    'mini-hiv':[2,2,3,3,3,4,4,4],
    'mini-hepatitis':[1,2,2,3,2,2,1,1],
    'mini-zika':[1,1,2,3,2,2,1,1],
    'mini-ebola':[1,2,4,3,5,3,2,1],
    'mini-yellow':[1,1,2,1,1,1,1,1]
  };
  Object.keys(sampleSeries).forEach(id => drawSparkline(id, sampleSeries[id]));

  // Star rating interaction: click or keyboard to set rating and update visuals
  (function starRating(){
    try{
      const groups = document.querySelectorAll('.star-rating');
      groups.forEach(group => {
        const stars = Array.from(group.querySelectorAll('.star'));
        const input = group.querySelector('input[type="hidden"][name="rating"]') || group.querySelector('input[name="rating"]');
        // initialize from current value
        const initVal = input ? parseInt(input.value||'0',10) : 0;
        function apply(val){
          stars.forEach((s,i)=>{
            if(i < val) { s.classList.add('star-on'); s.setAttribute('aria-pressed','true'); }
            else { s.classList.remove('star-on'); s.setAttribute('aria-pressed','false'); }
          });
          if(input) input.value = val;
        }
        apply(initVal);
        stars.forEach((s, idx)=>{
          s.addEventListener('click', function(e){ apply(idx+1); });
          s.addEventListener('keydown', function(e){ if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); apply(idx+1); s.focus(); } });
        });
      });
    }catch(e){/* ignore */}
  })();
});
