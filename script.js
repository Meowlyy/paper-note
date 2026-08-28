/* =========================================================
   CONFIG — replace these two values before you deploy.
   See README.md for step-by-step setup.
   ========================================================= */
const COUNTAPI_KEY   = "pn-8x2k9q-2026";
const FORMSPREE_ID   = "xnpqqjkd";
/* ========================================================= */

const COUNTAPI_BASE = "https://countapi.mileshilliard.com/api/v1";

// ---- real view counter ----
// Shows a quiet pulsing dot while the request is in flight, then fades
// straight to the real number — no count-up animation, so there's nothing
// to look choppy regardless of connection speed.
(async function trackView(){
  const el = document.getElementById('viewCount');
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

// ---- reveal paragraphs on scroll ----
const paras = document.querySelectorAll('.letter p');
const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      e.target.classList.add('in-view');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.2 });
paras.forEach(p => io.observe(p));

// ---- drifting dust motes ----
const ambient = document.querySelector('.ambient');
for(let i=0;i<14;i++){
  const m = document.createElement('div');
  m.className = 'mote';
  m.style.left = (20 + Math.random()*60) + '%';
  m.style.top = (10 + Math.random()*50) + '%';
  m.style.animationDelay = (Math.random()*14) + 's';
  m.style.animationDuration = (10 + Math.random()*8) + 's';
  ambient.appendChild(m);
}

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
