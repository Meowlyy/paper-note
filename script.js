/* =========================================================
   CONFIG — these two are already filled in for this project.
   ========================================================= */
const COUNTAPI_KEY   = "pn-8x2k9q-2026";
const FORMSPREE_ID   = "xnpqqjkd";
/* ========================================================= */

const COUNTAPI_BASE = "https://countapi.mileshilliard.com/api/v1";

// ---- real view counter (only lives in Chapter One) ----
(async function trackView(){
  const el = document.getElementById('viewCount');
  if(!el) return;
  if(COUNTAPI_KEY.startsWith("REPLACE")){
    el.textContent = "–";
    return;
  }
  try{
    const res = await fetch(`${COUNTAPI_BASE}/hit/${COUNTAPI_KEY}`);
    const data = await res.json();
    el.textContent = data.value.toLocaleString('en-US');
    el.classList.add('loaded');
  }catch(err){
    el.textContent = "–";
  }
})();

// ---- drifting dust motes ----
const ambient = document.querySelector('.ambient');
for(let i=0;i<7;i++){
  const m = document.createElement('div');
  m.className = 'mote';
  m.style.left = (20 + Math.random()*60) + '%';
  m.style.top = (10 + Math.random()*50) + '%';
  m.style.animationDelay = (Math.random()*14) + 's';
  m.style.animationDuration = (10 + Math.random()*8) + 's';
  ambient.appendChild(m);
}

// ---- chapter navigation ----
const chapters = Array.from(document.querySelectorAll('.chapter'));
const dots     = Array.from(document.querySelectorAll('.progress .dot'));
const sideChars = Array.from(document.querySelectorAll('.side-char'));
const prevBtn  = document.getElementById('prevBtn');
const nextBtn  = document.getElementById('nextBtn');
const sideArt  = document.getElementById('sideArt');
const stage    = document.getElementById('chaptersStage');
let current = 0;

// pin the stage to Chapter One's real height on load, so the very
// first transition has a correct starting point to animate from.
stage.style.height = chapters[0].scrollHeight + 'px';

function updateNav(){
  prevBtn.classList.toggle('hidden', current === 0);
  nextBtn.classList.toggle('hidden', current === chapters.length - 1);
  dots.forEach((d,i)=> d.classList.toggle('current', i === current));
  chapters.forEach((c,i)=>{
    if(i === current){ c.removeAttribute('inert'); c.removeAttribute('aria-hidden'); }
    else{ c.setAttribute('inert',''); c.setAttribute('aria-hidden','true'); }
  });
}

function updateSideArt(){
  const match = sideChars.find(c => parseInt(c.dataset.for, 10) === current);
  sideChars.forEach(c => c.classList.toggle('active', c === match));
  sideArt.classList.toggle('empty', !match);
}

const viewsBadge = document.getElementById('views');
function updateViewsBadge(){
  viewsBadge.classList.toggle('hidden', current !== 0);
}

function goTo(index){
  if(index === current || index < 0 || index >= chapters.length) return;

  // 1. pin the stage at its current height so there's a real starting
  //    point for the height transition (can't animate from "auto").
  stage.style.height = stage.getBoundingClientRect().height + 'px';

  requestAnimationFrame(()=>{
    // 2. crossfade: both happen together, no gap in between.
    chapters[current].classList.remove('active');
    chapters[index].classList.add('active');
    current = index;
    updateNav();
    updateSideArt();
    updateViewsBadge();
    maybeTriggerPaywallJoke();

    // 3. measure the new chapter's natural height now that it's in
    //    flow, then animate the stage to it on the next frame.
    requestAnimationFrame(()=>{
      stage.style.height = chapters[index].scrollHeight + 'px';
    });
  });
}

// keep the stage sized correctly if the viewport changes (e.g. rotation)
window.addEventListener('resize', ()=>{
  stage.style.transition = 'none';
  stage.style.height = chapters[current].scrollHeight + 'px';
  requestAnimationFrame(()=>{ stage.style.transition = ''; });
});

prevBtn.addEventListener('click', ()=> goTo(current - 1));
nextBtn.addEventListener('click', ()=> goTo(current + 1));
dots.forEach(d => d.addEventListener('click', ()=> goTo(parseInt(d.dataset.target, 10))));

document.addEventListener('keydown', (e)=>{
  const tag = document.activeElement.tagName;
  if(tag === 'TEXTAREA' || tag === 'INPUT') return; // don't hijack typing
  if(e.key === 'ArrowRight') goTo(current + 1);
  if(e.key === 'ArrowLeft')  goTo(current - 1);
});

updateNav();
updateSideArt();
updateViewsBadge();

// ---- the little paywall joke (fires once, right as Chapter Two loads) ----
let paywallShown = false;

function maybeTriggerPaywallJoke(){
  if(current !== 1 || paywallShown) return;
  paywallShown = true;
  // small fixed delay just so the chapter transition finishes first
  setTimeout(()=>{
    if(current === 1) openPaywall();
  }, 600);
}

function showPaywallStep(n){
  [1,2,3,4].forEach(i=>{
    document.getElementById('paywallStep' + i).hidden = (i !== n);
  });
}

function openPaywall(){
  document.getElementById('paywallOverlay').classList.add('show');
  showPaywallStep(1);

  const fill = document.getElementById('loadingFill');
  fill.style.animation = 'none';
  void fill.offsetWidth; // force reflow so the animation restarts cleanly
  fill.style.animation = 'loading-fill 7s linear forwards';

  setTimeout(()=> showPaywallStep(2), 7000);
}

document.getElementById('paywallOkBtn').addEventListener('click', ()=>{
  showPaywallStep(3);
  let secondsLeft = 25;
  const timerEl = document.getElementById('paywallTimer');
  timerEl.textContent = secondsLeft;

  const interval = setInterval(()=>{
    secondsLeft--;
    timerEl.textContent = secondsLeft;
    if(secondsLeft <= 0){
      clearInterval(interval);
      showPaywallStep(4);
    }
  }, 1000);
});

document.getElementById('paywallCloseBtn').addEventListener('click', ()=>{
  document.getElementById('paywallOverlay').classList.remove('show');
});

// ---- private message form (Formspree — goes to your inbox only) ----
const form = document.getElementById('commentForm');
const status = document.getElementById('formStatus');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async function(e){
  e.preventDefault();

  if(FORMSPREE_ID.startsWith("REPLACE")){
    status.textContent = "Form isn't connected yet — see README.md.";
    status.className = "form-status error";
    return;
  }

  const msg = document.getElementById('commentMsg').value.trim();
  if(!msg) return;

  submitBtn.disabled = true;
  status.textContent = "Sending...";
  status.className = "form-status";

  try{
    const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
      method: "POST",
      headers: { "Accept": "application/json" },
      body: new FormData(form)
    });

    if(res.ok){
      status.textContent = "Sent, privately. Thank you for that.";
      status.className = "form-status ok";
      form.reset();
    }else{
      status.textContent = "Something went wrong. Try again?";
      status.className = "form-status error";
    }
  }catch(err){
    status.textContent = "Couldn't send that. Check your connection.";
    status.className = "form-status error";
  }finally{
    submitBtn.disabled = false;
  }
});
