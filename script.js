'use strict';
(() => {
  const $ = (selector, parent=document) => parent.querySelector(selector);
  const $$ = (selector, parent=document) => [...parent.querySelectorAll(selector)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const progress = $('#readingProgress');
  const rail = $('#chapterRail');
  const percent = $('#railPercent');
  const chapters = $$('.article-section[data-chapter]');
  const railLinks = $$('.chapter-rail a[data-section]');
  const navLinks = $$('.desktop-nav a');
  const toast = $('#toast');
  let toastTimer;
  function notify(message){toast.textContent=message;toast.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),2900)}
  const reveals = $$('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) reveals.forEach(el=>el.classList.add('in-view'));
  else {
    const revealObserver = new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){entry.target.classList.add('in-view');revealObserver.unobserve(entry.target)}
      });
    },{threshold:.07,rootMargin:'0px 0px -30px 0px'});
    reveals.forEach(el=>revealObserver.observe(el));
  }
  let progressQueued=false;
  function onScroll(){
    if(progressQueued)return;
    progressQueued=true;
    requestAnimationFrame(()=>{
      const max=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
      const p=Math.min(100,Math.max(0,(window.scrollY/max)*100));
      progress.style.width=p.toFixed(1)+'%';percent.textContent=String(Math.round(p)).padStart(2,'0')+'%';
      rail.classList.toggle('ready',window.scrollY > window.innerHeight*.72);
      const middle=window.scrollY+Math.min(window.innerHeight*.37,330);
      let active='';
      for(const section of chapters){if(middle>=section.offsetTop)active=section.id}
      railLinks.forEach(a=>{a.classList.toggle('active',a.dataset.section===active);if(a.dataset.section===active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')});
      navLinks.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+active));
      progressQueued=false;
    });
  }
  window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',onScroll,{passive:true});onScroll();
  const filters=$$('.filter');
  const tiles=$$('.game-tile');
  filters.forEach(btn=>btn.addEventListener('click',()=>{
    const value=btn.dataset.filter;
    filters.forEach(b=>{const active=b===btn;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
    tiles.forEach(tile=>{tile.hidden=!(value==='all'||tile.dataset.genre===value)});
  }));
  const audio=$('#readingAudio');
  const dock=$('#audioDock');
  const headerAudio=$('#headerAudio');
  const dockAudio=$('#dockAudio');
  const reopen=$('#reopenAudio');
  const slider=$('#volumeRange');
  const volumeValue=$('#volumeValue');
  const headerLabel=$('#headerAudioLabel');
  const fade={id:null};
  let desiredVolume=Number(slider.value)/100;
  let dockDismissed=false;
  let audioBusy=false;
  audio.volume=desiredVolume;
  function updateAudioUI(){
    const playing=!audio.paused;
    document.body.classList.toggle('is-playing',playing);
    headerLabel.textContent=playing?'إيقاف الموسيقى':'استمع أثناء القراءة';
    headerAudio.setAttribute('aria-label',playing?'إيقاف الموسيقى':'تشغيل الموسيقى');
    dockAudio.setAttribute('aria-label',playing?'إيقاف الموسيقى':'تشغيل الموسيقى');
    dockAudio.setAttribute('aria-pressed',String(playing));
    dock.classList.toggle('visible',playing||!dockDismissed&&audio.currentTime>0);
    reopen.classList.toggle('visible',dockDismissed);
  }
  function stopFade(){if(fade.id!==null)cancelAnimationFrame(fade.id);fade.id=null}
  function animateVolume(from,to,duration,onDone){
    stopFade();
    if(reduceMotion){audio.volume=to;onDone?.();return}
    const start=performance.now();
    const loop=now=>{
      const t=Math.min(1,(now-start)/duration);
      audio.volume=Math.min(1,Math.max(0,from+(to-from)*(1-Math.pow(1-t,3))));
      if(t<1)fade.id=requestAnimationFrame(loop);
      else{fade.id=null;onDone?.()}
    };
    fade.id=requestAnimationFrame(loop);
  }
  async function toggleAudio(){
    if(audioBusy)return;
    audioBusy=true;stopFade();
    if(audio.paused){
      dockDismissed=false;
      audio.volume=0;
      try{await audio.play();animateVolume(0,desiredVolume,1200);notify('تم تشغيل أجواء القراءة بصوت هادئ');}
      catch(error){notify('تعذر تشغيل الصوت — تأكد من توفر ملف Serenity في المجلد');}
    } else {
      animateVolume(audio.volume,0,400,()=>{audio.pause();audio.volume=desiredVolume;updateAudioUI()});
    }
    audioBusy=false;updateAudioUI();
  }
  [headerAudio,$('#heroAudio'),dockAudio].forEach(btn=>btn.addEventListener('click',toggleAudio));
  slider.addEventListener('input',()=>{
    desiredVolume=Number(slider.value)/100;volumeValue.textContent=slider.value+'%';
    if(!audio.paused){stopFade();audio.volume=desiredVolume}
    else audio.volume=desiredVolume;
  });
  $('#hideAudio').addEventListener('click',()=>{dockDismissed=true;dock.classList.remove('visible');reopen.classList.add('visible')});
  reopen.addEventListener('click',()=>{dockDismissed=false;dock.classList.add('visible');reopen.classList.remove('visible')});
  audio.addEventListener('play',updateAudioUI);audio.addEventListener('pause',updateAudioUI);
  audio.addEventListener('error',()=>{if(audio.error)notify('تعذر تحميل ملف الموسيقى')});
  const capture=$('#captureToggle');
  capture.addEventListener('click',()=>{
    const on=document.body.classList.toggle('capture-mode');
    capture.setAttribute('aria-pressed',String(on));
    capture.setAttribute('aria-label',on?'إيقاف وضع التصوير':'تفعيل وضع التصوير');
    notify(on?'وضع التصوير مفعّل — مناسبة لالتقاط لقطات الثريد':'تم الرجوع إلى وضع القراءة');
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&document.body.classList.contains('capture-mode')){
      document.body.classList.remove('capture-mode');
      capture.setAttribute('aria-pressed','false');
      capture.setAttribute('aria-label','تفعيل وضع التصوير');
      notify('تم إنهاء وضع التصوير');
    }
  });
  const shareText='كابكوم ليست Resident Evil فقط. لماذا يصبح نجاحها تهمة بينما نقبل استمرار سلاسل أخرى؟ مقال تحليلي عن التنوع وازدواجية المعايير — SHAINEL';
  async function copyText(text){
    try{await navigator.clipboard.writeText(text);notify('تم النسخ بنجاح');}
    catch(e){const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');notify('تم النسخ')}catch(e2){notify('لم يتمكن المتصفح من النسخ')}ta.remove()}
  }
  $('#copyQuote').addEventListener('click',()=>copyText('انتقد كابكوم كما تشاء، لكن لا تختزل كل ما تصنعه في اسم واحد. لأن اختلاف الأسماء لا يصنع التنوع وحده… بل اختلاف التجربة. — SHAINEL'));
  $('#shareArticle').addEventListener('click',()=>{
    const url=location.protocol==='http:'||location.protocol==='https:'?location.href.split('#')[0]:'';
    if(!url){copyText(shareText);notify('تم نسخ نص التغريدة — ارفع الصفحة أولًا لإضافة الرابط');return}
    const q='https://twitter.com/intent/tweet?text='+encodeURIComponent(shareText)+'&url='+encodeURIComponent(url);
    window.open(q,'_blank','noopener,noreferrer');
  });
  updateAudioUI();
})();
