/* TCFLiCK의 모든 주요 페이지에 동일한 헤더를 만들고 현재 페이지를 표시합니다. */
(function(){
  const items=[
    ['⌂ 홈','/','home'],['서비스','/services','services'],['티씨플릭 소개','/about','about'],['이용 안내','/guide','guide'],
    ['인사이트','/insights','insights'],['FAQ','/faq','faq'],['공지사항','/notice','notice'],['문의','/contact','contact']
  ];
  const path=(location.pathname==='/index.html'?'/':location.pathname).replace(/\/$/,'')||'/';
  const current=path==='/'?'home':(items.find(item=>item[1]===path)||[])[2]||'';
  const links=items.map(item=>'<a href="'+item[1]+'" class="'+(item[2]===current?'active':'')+'"'+(item[2]===current?' aria-current="page"':'')+'>'+item[0]+'</a>').join('');
  const header=document.createElement('header');
  header.className='tcflick-global-header';
  header.setAttribute('aria-label','티씨플릭 TCFLiCK 공통 메뉴');
  header.innerHTML='<div class="tcflick-nav-wrap"><a class="tcflick-global-logo" href="/" aria-label="TCFLiCK 홈">TC<span>FLiCK</span></a><nav class="tcflick-nav-links" aria-label="주요 메뉴">'+links+'</nav><div class="tcflick-nav-actions"><button class="tcflick-menu-btn" id="tcflickMenu" type="button" aria-label="메뉴 열기" aria-expanded="false">☰</button><button class="tcflick-theme-btn" id="tcflickTheme" type="button" aria-label="다크모드 전환">☾</button></div></div>';
  const old=document.querySelector('body>header');
  if(old) old.replaceWith(header); else document.body.prepend(header);

  const applyTheme=()=>{
    let saved=null;try{saved=localStorage.getItem('tcflick-theme');}catch{}
    const dark=saved==='dark'||(!saved&&window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark',dark);
    const button=document.getElementById('tcflickTheme');
    if(button) button.textContent=dark?'☀':'☾';
  };
  applyTheme();

  const menu=document.getElementById('tcflickMenu');
  if(menu) menu.addEventListener('click',event=>{event.stopPropagation();const open=!header.classList.contains('mobile-open');setOpen(open);menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'메뉴 닫기':'메뉴 열기');menu.textContent=open?'×':'☰';});

  const updateExpandedHeight=()=>{
    const nav=header.querySelector('.tcflick-nav-links');
    if(!nav)return;
    // Measure every wrapped row, including padding, so content shifts the same distance.
    const height=Math.ceil(nav.getBoundingClientRect().height || nav.scrollHeight);
    header.style.setProperty('--tcflick-expanded-height',(76+Math.max(70,height))+'px');
  };
  updateExpandedHeight();
  window.addEventListener('resize',updateExpandedHeight);
  if(document.fonts?.ready)document.fonts.ready.then(updateExpandedHeight);
  // 마우스가 상단 헤더에 들어오면 클릭 없이 메뉴를 펼칩니다.
  // 메뉴는 헤더 안에 배치되어 이동 중에도 닫히지 않습니다.
  const hoverCapable=()=>window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  header.addEventListener('pointerenter',event=>{
    if(event.pointerType==='mouse'&&hoverCapable()){header.classList.add('hover-open');updateExpandedHeight();if(window.matchMedia('(max-width:1050px)').matches)setOpen(true);}
  });
  header.addEventListener('pointerleave',event=>{
    if(event.pointerType==='mouse'){header.classList.remove('hover-open');if(window.matchMedia('(max-width:1050px)').matches)setOpen(false);}
  });

  const theme=document.getElementById('tcflickTheme');
  if(theme) theme.addEventListener('click',event=>{
    event.stopPropagation();
    const dark=!document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark',dark);
    try{localStorage.setItem('tcflick-theme',dark?'dark':'light');}catch{}
    theme.textContent=dark?'☀':'☾';
  });

  const isMobile=()=>window.matchMedia('(max-width:1050px)').matches;
  const setOpen=open=>{
    if(isMobile()){header.classList.toggle('mobile-open',open);if(menu){menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'메뉴 닫기':'메뉴 열기');menu.textContent=open?'×':'☰';}}
  };

  /* 모바일은 숨겨진 상단 영역 자체를 터치하면 메뉴를 엽니다. */
  header.addEventListener('pointerdown',event=>{
    if(!isMobile() || event.target.closest('a,button')) return;
    const rect=header.getBoundingClientRect();
    if(event.clientY<=rect.top+24) setOpen(!header.classList.contains('mobile-open'));
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&header.classList.contains('mobile-open')){setOpen(false);menu?.focus();}});
  document.addEventListener('click',event=>{if(!header.contains(event.target))setOpen(false);});
  header.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>setOpen(false)));
  window.addEventListener('resize',()=>{if(!isMobile()){header.classList.remove('mobile-open');if(menu){menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','메뉴 열기');menu.textContent='☰';}}});
})();
