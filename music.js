/* =========================================================
   Background music — soft, generative piano ambience.

   This is NOT a recording of any existing song. It's a real
   (CC0) grand-piano sample set (the Salamander piano, hosted
   publicly by the Tone.js project) played by small original
   chord/arpeggio patterns written below — one mood per
   chapter. Nothing here reproduces copyrighted music.

   Everything fails silently: if Tone.js can't load (offline,
   blocked script, etc.) the site just runs without music.
   ========================================================= */

const LetterMusic = (function(){

  let ready = false;
  let started = false;
  let sampler = null;
  let masterGain = null;
  let currentPart = null;
  let currentChapter = -1;
  let userVolume = 0.35;   // 0..1, from the slider
  let muted = false;

  const CROSSFADE = 1.4; // seconds

  // ---- one small original piano pattern per chapter, matching its mood ----
  // chords: a sequence of chord voicings, played as a gentle rolled arpeggio.
  // chordDur: how long each chord "sits" before moving to the next (seconds).
  // noteGap: spacing between the arpeggiated notes inside a chord.
  // noteDur: how long each note rings.
  const CHAPTER_MUSIC = [
    { // Ch1 — The Departure: wistful but tender, gently moving
      chords: [['A3','C4','E4'],['F3','A3','C4'],['C4','E4','G4'],['G3','B3','D4']],
      chordDur: 6, noteGap: 1.5, noteDur: 3.2, vel: 0.20
    },
    { // Ch2 — the lonelier chapter: sparse, minor, more silence between notes
      chords: [['D3','F3','A3'],['A2','C3','E3'],['C3','E3','G3'],['G2','B2','D3']],
      chordDur: 8, noteGap: 2.6, noteDur: 4.5, vel: 0.16
    },
    { // Ch3 — the hardest one: almost a drone, very slow, deliberately calming
      chords: [['A2','E3'],['A2','E3'],['F2','C3'],['G2','D3']],
      chordDur: 10, noteGap: 5, noteDur: 8.5, vel: 0.14
    },
    { // Ch4 — still standing: a little warmer, drifting from minor toward major
      chords: [['F3','A3','C4'],['C3','E3','G3'],['A2','C3','E3'],['G2','B2','D3','G3']],
      chordDur: 6, noteGap: 1.8, noteDur: 3.4, vel: 0.22
    },
    { // Ch5 — closing: simple, resolving, quietly peaceful
      chords: [['C4','E4','G4'],['G3','B3','D4'],['A3','C4','E4'],['F3','A3','C4']],
      chordDur: 7, noteGap: 2.2, noteDur: 3.8, vel: 0.19
    }
  ];

  function buildEvents(cfg){
    const events = [];
    let t = 0;
    cfg.chords.forEach(chord => {
      chord.forEach((note, i) => {
        events.push({ time: t + i * cfg.noteGap, note, dur: cfg.noteDur, vel: cfg.vel });
      });
      t += cfg.chordDur;
    });
    return { events, loopEnd: t };
  }

  function buildPart(chapterIndex){
    const cfg = CHAPTER_MUSIC[chapterIndex];
    if(!cfg) return null;
    const { events, loopEnd } = buildEvents(cfg);
    const part = new Tone.Part((time, ev) => {
      // tiny humanizing jitter so it doesn't feel mechanical
      const jitterVel = ev.vel + (Math.random() - 0.5) * 0.03;
      sampler.triggerAttackRelease(ev.note, ev.dur, time, Math.max(0.03, jitterVel));
    }, events);
    part.loop = true;
    part.loopEnd = loopEnd;
    return part;
  }

  function applyVolume(){
    if(!masterGain) return;
    const target = muted ? 0 : userVolume;
    // gentle -60..0 db-ish mapping via gain, kept simple and safe
    masterGain.gain.rampTo(target * 0.9, 0.3);
  }

  function init(){
    if(ready || typeof Tone === 'undefined') return;
    ready = true;

    masterGain = new Tone.Gain(0).toDestination();
    const reverb = new Tone.Reverb({ decay: 6, wet: 0.35 });
    const filter = new Tone.Filter({ frequency: 2600, type: 'lowpass' });

    sampler = new Tone.Sampler({
      urls: {
        A0:"A0.mp3", C1:"C1.mp3", "D#1":"Ds1.mp3", "F#1":"Fs1.mp3",
        A1:"A1.mp3", C2:"C2.mp3", "D#2":"Ds2.mp3", "F#2":"Fs2.mp3",
        A2:"A2.mp3", C3:"C3.mp3", "D#3":"Ds3.mp3", "F#3":"Fs3.mp3",
        A3:"A3.mp3", C4:"C4.mp3", "D#4":"Ds4.mp3", "F#4":"Fs4.mp3",
        A4:"A4.mp3", C5:"C5.mp3", "D#5":"Ds5.mp3", "F#5":"Fs5.mp3",
        A5:"A5.mp3", C6:"C6.mp3", "D#6":"Ds6.mp3", "F#6":"Fs6.mp3",
        A6:"A6.mp3", C7:"C7.mp3", "D#7":"Ds7.mp3", "F#7":"Fs7.mp3", A7:"A7.mp3"
      },
      release: 2.5,
      baseUrl: "https://tonejs.github.io/audio/salamander/"
    });

    sampler.chain(filter, reverb, masterGain);

    // restore saved preferences, if any
    try{
      const savedVol = localStorage.getItem('letterMusicVolume');
      const savedMute = localStorage.getItem('letterMusicMuted');
      if(savedVol !== null) userVolume = parseFloat(savedVol);
      if(savedMute !== null) muted = savedMute === 'true';
    }catch(e){ /* ignore, defaults are fine */ }

    setupUI();
  }

  function setupUI(){
    const slider = document.getElementById('musicVolume');
    const toggle = document.getElementById('musicToggle');
    if(!slider || !toggle) return;

    slider.value = Math.round(userVolume * 100);
    reflectMuteUI();

    slider.addEventListener('input', () => {
      userVolume = slider.value / 100;
      if(userVolume > 0 && muted){ muted = false; reflectMuteUI(); }
      applyVolume();
      try{
        localStorage.setItem('letterMusicVolume', String(userVolume));
        localStorage.setItem('letterMusicMuted', String(muted));
      }catch(e){}
    });

    toggle.addEventListener('click', () => {
      muted = !muted;
      reflectMuteUI();
      applyVolume();
      try{ localStorage.setItem('letterMusicMuted', String(muted)); }catch(e){}
    });
  }

  function reflectMuteUI(){
    const slider = document.getElementById('musicVolume');
    const toggle = document.getElementById('musicToggle');
    if(!slider || !toggle) return;
    slider.classList.toggle('is-muted', muted);
    toggle.classList.toggle('is-muted', muted);
    toggle.setAttribute('aria-pressed', String(muted));
    toggle.querySelector('.icon-sound').hidden = muted;
    toggle.querySelector('.icon-muted').hidden = !muted;
  }

  async function start(){
    init();
    if(started || typeof Tone === 'undefined') return;
    started = true;
    try{
      await Tone.start();
      await Tone.loaded();
      Tone.Transport.start();
      applyVolume();
      onChapterChange(0);
    }catch(e){
      // audio couldn't start (blocked, offline, etc.) — fail quietly
      started = false;
    }
  }

  function onChapterChange(index){
    if(!started || !sampler || index === currentChapter) return;
    currentChapter = index;

    const old = currentPart;
    const wasPlayingSomething = !!old;

    const bringInNew = () => {
      const next = buildPart(index);
      if(!next) return;
      next.start(0);
      currentPart = next;
      if(!muted) masterGain.gain.rampTo(userVolume * 0.9, CROSSFADE);
    };

    if(wasPlayingSomething){
      masterGain.gain.rampTo(0, CROSSFADE * 0.7);
      setTimeout(() => {
        old.stop(); old.dispose();
        bringInNew();
      }, CROSSFADE * 700);
    } else {
      bringInNew();
    }
  }

  return { start, onChapterChange };
})();
