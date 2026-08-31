/* =========================================================
   Background music — two real piano improvisations (chill02
   and chill03), played back-to-back, alternating forever.

   Deliberately plain <audio> element playback, NOT the Web
   Audio API. Some browsers/extensions mute or noise up raw
   AudioContext output as an anti-fingerprinting measure —
   regular <audio> playback isn't affected by that, and it's
   simpler besides.
   ========================================================= */

const LetterMusic = (function(){

  const PLAYLIST = [
    'assets/music/chill02.mp3',
    'assets/music/chill03.mp3'
  ];

  let audio = null;
  let started = false;
  let trackIndex = 0;

  let userVolume = 0.35;   // 0..1, from the slider
  let muted = false;

  function applyVolume(){
    if(!audio) return;
    audio.volume = muted ? 0 : userVolume;
  }

  function init(){
    if(audio) return;

    audio = new Audio();
    audio.preload = 'auto';
    audio.addEventListener('ended', () => {
      trackIndex = (trackIndex + 1) % PLAYLIST.length;
      playCurrent();
    });
    audio.addEventListener('error', () => {
      console.warn('[LetterMusic] track failed to load, skipping to next one:', PLAYLIST[trackIndex]);
      trackIndex = (trackIndex + 1) % PLAYLIST.length;
      setTimeout(playCurrent, 1000);
    });

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

  function playCurrent(){
    if(!audio) return;
    audio.src = PLAYLIST[trackIndex];
    applyVolume();
    const p = audio.play();
    if(p && p.catch){
      p.catch(e => console.warn('[LetterMusic] play() was blocked:', e));
    }
  }

  function start(){
    init();
    if(started) return;
    started = true;
    playCurrent();
  }

  // chapters don't change the music — kept only so script.js's
  // existing call site doesn't need to change.
  function onChapterChange(_index){}

  return { start, onChapterChange };
})();
