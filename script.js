/* =========================================================
   CONFIG — these two are already filled in for this project.
   ========================================================= */
const COUNTAPI_KEY   = "pn-8x2k9q-2026";
const FORMSPREE_ID   = "xnpqqjkd";
const BIRTHDATE      = { year: 2007, month: 7, day: 18 }; // month is 1-indexed here
/* ========================================================= */

const COUNTAPI_BASE = "https://countapi.mileshilliard.com/api/v1";

// ---- drifting dust motes (purely decorative, fine to show before the gate) ----
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

// ---- entry gate ----
function calcCurrentAge(){
  const now = new Date();
  let age = now.getFullYear() - BIRTHDATE.year;
  const hadBirthdayThisYear =
    (now.getMonth() + 1 > BIRTHDATE.month) ||
    (now.getMonth() + 1 === BIRTHDATE.month && now.getDate() >= BIRTHDATE.day);
  if(!hadBirthdayThisYear) age--;
  return age;
}

function b64ToUtf8(b64){
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

const gateOverlay = document.getElementById('gateOverlay');
const gateStatus  = document.getElementById('gateStatus');
let gateSize  = null;
let gateTired = null;

document.querySelectorAll('.gate-choices').forEach(group => {
  const q = group.dataset.q;
  group.querySelectorAll('.gate-choice').forEach(btn => {
    btn.addEventListener('click', ()=>{
      group.querySelectorAll('.gate-choice').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      if(q === 'size') gateSize = btn.dataset.val;
      if(q === 'tired') gateTired = btn.dataset.val;
    });
  });
});

document.getElementById('gateSubmit').addEventListener('click', ()=>{
  const ageInput = parseInt(document.getElementById('gateAge').value, 10);
  const correct = (ageInput === calcCurrentAge()) && (gateSize === 'small') && (gateTired === 'yes');

  if(!correct){
    gateStatus.textContent = "hmm, not quite — try again?";
    gateStatus.className = "gate-status";
    return;
  }

  gateStatus.textContent = "yep, that's me :)";
  gateStatus.className = "gate-status ok";

  // this click is the real user gesture — audio has to start right here,
  // synchronously, or browsers will silently refuse to let it play later.
  if(typeof LetterMusic !== 'undefined') LetterMusic.start();

  setTimeout(()=>{
    gateOverlay.classList.add('passed');
    revealLetter();
  }, 500);
});

// ---- everything below only happens once the gate is passed ----
function revealLetter(){

  // decode each chapter's real content and drop it into its placeholder
  document.querySelectorAll('.chapter-body').forEach(el => {
    const i = parseInt(el.dataset.body, 10);
    if(CHAPTER_CONTENT_B64[i] !== undefined){
      el.innerHTML = b64ToUtf8(CHAPTER_CONTENT_B64[i]);
    }
  });

  // real view counter (only lives in Chapter One)
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

  // now that Chapter One actually has content, size the stage to it
  stage.style.height = chapters[0].scrollHeight + 'px';
  updateNav();
  updateSideArt();
  updateViewsBadge();
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

  // jump to the top instantly, before anything else starts — trying to
  // animate this at the same time as the chapter height change caused
  // conflicts (the page's scrollable height was shifting mid-scroll).
  window.scrollTo(0, 0);

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
    if(typeof LetterMusic !== 'undefined') LetterMusic.onChapterChange(current);

    // 3. measure the new chapter's natural height now that it's in
    //    flow, then animate the stage to it on the next frame.
    requestAnimationFrame(()=>{
      stage.style.height = chapters[index].scrollHeight + 'px';
    });
  });
}

// keep the stage sized correctly if the viewport changes (e.g. rotation) —
// but ignore trivial/spurious resize events (like a scrollbar toggling)
// so it never fires from just clicking or selecting text.
let lastKnownWidth = window.innerWidth;
window.addEventListener('resize', ()=>{
  if(Math.abs(window.innerWidth - lastKnownWidth) < 5) return;
  lastKnownWidth = window.innerWidth;
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

// small deterrent against casual right-click -> inspect. doesn't stop
// anyone determined (F12 still works), just discourages the casual case.
document.addEventListener('contextmenu', (e) => e.preventDefault());

// fade the header out softly on scroll, back in near the top
const siteHeader = document.querySelector('.site-header');
window.addEventListener('scroll', ()=>{
  siteHeader.classList.toggle('faded', window.scrollY > 40);
}, { passive: true });

// safety net: some browsers are stricter than others about which click
// counts as "real" user activation for audio. LetterMusic.start() is
// idempotent (does nothing once already running), so it's safe to just
// keep trying on any click/keypress until it actually takes.
function ensureMusicStarted(){
  if(typeof LetterMusic !== 'undefined') LetterMusic.start();
}
document.addEventListener('click', ensureMusicStarted);
document.addEventListener('keydown', ensureMusicStarted);
