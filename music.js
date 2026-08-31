/* =========================================================
   Background music — two real piano improvisations (chill02
   and chill03), played back-to-back, alternating forever.
   Not tied to which chapter is open — it's one continuous
   soft loop for the whole visit.
   ========================================================= */

const LetterMusic = (function(){

  const PLAYLIST = [
    'assets/music/chill02.mid',
    'assets/music/chill03.mid'
  ];

  let ready = false;
  let started = false;
  let sampler = null;
  let masterGain = null;
  let midiCache = {};      // url -> parsed Midi object
  let nextTrackTimer = null;
  let playIndex = 0;

  let userVolume = 0.35;   // 0..1, from the slider
  let muted = false;

  function applyVolume(){
    if(!masterGain) return;
    const target = muted ? 0 : userVolume;
    masterGain.gain.rampTo(target * 0.9, 0.3);
  }

  async function init(){
    if(ready || typeof Tone === 'undefined') return;
    ready = true;

    masterGain = new Tone.Gain(0).toDestination();
    const reverb = new Tone.Reverb({ decay: 5, wet: 0.3 });
    const filter = new Tone.Filter({ frequency: 3200, type: 'lowpass' });

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

    console.log('[LetterMusic] waiting for reverb impulse response…');
    await reverb.ready;
    console.log('[LetterMusic] reverb ready');

    try{
      const savedVol = localStorage.getItem('letterMusicVolume');
      const savedMute = localStorage.getItem('letterMusicMuted');
      if(savedVol !== null) userVolume = parseFloat(savedVol);
      if(savedMute !== null) muted = savedMute === 'true';
    }catch(e){ /* defaults are fine */ }

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

  async function loadMidi(url){
    if(midiCache[url]) return midiCache[url];
    const midi = await Midi.fromUrl(url);
    midiCache[url] = midi;
    return midi;
  }

  async function playTrack(index){
    if(!started) return; // stopped in the meantime
    const url = PLAYLIST[index];
    console.log('[LetterMusic] loading track', index, url);
    let midi;
    try{
      midi = await loadMidi(url);
      console.log('[LetterMusic] loaded midi ok, tracks:', midi.tracks.length, 'total notes:', midi.tracks.reduce((n,t)=>n+t.notes.length,0));
    }catch(e){
      console.warn(
        `[LetterMusic] couldn't load "${url}". If you're testing via a file:// URL, ` +
        `browsers block fetching local files that way — run a local server instead ` +
        `(e.g. "python -m http.server") or test on the deployed GitHub Pages site.`,
        e
      );
      // couldn't load this one — skip to the next rather than going silent forever
      nextTrackTimer = setTimeout(() => playTrack((index + 1) % PLAYLIST.length), 2000);
      return;
    }
    if(!started) return;

    const startAt = Tone.now() + 0.3;
    let trackEnd = 0;
    let scheduled = 0;
    midi.tracks.forEach(track => {
      track.notes.forEach(note => {
        sampler.triggerAttackRelease(note.name, note.duration, startAt + note.time, note.velocity);
        scheduled++;
        const end = note.time + note.duration;
        if(end > trackEnd) trackEnd = end;
      });
    });
    console.log('[LetterMusic] scheduled', scheduled, 'notes, track length', trackEnd.toFixed(1), 's, gain value:', masterGain.gain.value, 'muted:', muted);

    playIndex = index;
    clearTimeout(nextTrackTimer);
    nextTrackTimer = setTimeout(() => {
      playTrack((index + 1) % PLAYLIST.length);
    }, (trackEnd + 1.2) * 1000);
  }

  async function start(){
    if(started){ console.log('[LetterMusic] already started, skipping'); return; }
    if(typeof Tone === 'undefined'){ console.warn('[LetterMusic] Tone.js not loaded'); return; }
    if(typeof Midi === 'undefined'){ console.warn('[LetterMusic] @tonejs/midi not loaded'); return; }
    started = true;
    try{
      await Tone.start();
      console.log('[LetterMusic] Tone.start() resolved, context state now:', Tone.context.state);
      await init();
      console.log('[LetterMusic] waiting for piano samples to finish loading…');
      await Tone.loaded();
      console.log('[LetterMusic] piano samples loaded, scheduling first track');
      applyVolume();
      playTrack(0);
    }catch(e){
      console.error('[LetterMusic] failed to start:', e);
      started = false; // audio blocked / offline
    }
  }

  // chapters no longer change the music — this stays only so script.js's
  // existing call site doesn't need to change.
  function onChapterChange(_index){}

  return { start, onChapterChange };
})();
