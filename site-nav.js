/* TCFLiCK의 모든 주요 페이지에 동일한 헤더를 제공하고 현재 페이지를 표시합니다. */
(function(){
  const items=[
    ['홈','/','home'],['서비스','/services.html','services'],['이용 안내','/guide.html','guide'],['인사이트','/insights.html','insights'],['공지사항','/notice.html','notice'],['문의','/contact.html','contact']
  ];
  const path=location.pathname.replace(/\\/$/,'')||'/';
  const current=path==='/'?'home':(items.find(x=>x[1]===path)||[])[2]||'';
  const links=items.map(x=>'<a href="'+x[1]+'" class="'+(x[2]===current?'active':'')+'">'+x[0]+'</a>').join('');
  const header=document.createElement('header');header.className='tcflick-global-header';
  header.innerHTML='<div class="tcflick-nav-wrap"><a class="tcflick-global-logo" href="/" aria-label="TCFLiCK 홈">TC<span>FLiCK</span></a><nav class="tcflick-nav-links" aria-label="주요 메뉴">'+links+'</nav><div class="tcflick-nav-actions"><button class="tcflick-theme-btn" id="tcflickTheme" aria-label="다크모드 전환">☾</button><button class="tcflick-menu-btn" id="tcflickMenu" aria-label="메뉴 열기" aria-expanded="false">☰</button></div></div><nav class="tcflick-mobile-panel" id="tcflickMobile" aria-label="모바일 메뉴">'+links+'</nav>';
  const old=document.querySelector('body>header');if(old)old.replaceWith(header);else document.body.prepend(header);
  document.documentElement.classList.toggle('dark',localStorage.getItem('tcflick-theme')==='dark'||(!localStorage.getItem('tcflick-theme')&&matchMedia('(prefers-color-scheme: dark)').matches));
  const theme=document.getElementById('tcflickTheme');const sync=()=>theme.textContent=document.documentElement.classList.contains('dark')?'☀':'☾';sync();theme.onclick=()=>{const d=document.documentElement.classList.toggle('dark');localStorage.setItem('tcflick-theme',d?'dark':'light');sync()};
  const menu=document.getElementById('tcflickMenu'),panel=document.getElementById('tcflickMobile');menu.onclick=()=>{const open=panel.classList.toggle('open');menu.setAttribute('aria-expanded',open?'true':'false');menu.textContent=open?'×':'☰'};
})();
