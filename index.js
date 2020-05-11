/**
 * Save songs uploaded, for offline - use official drive API
 * when page is backgrounded or something, when come back to the play/pause button tries to play and pause the song at the same time
 * add album and artwork options? - currently just the page icon
 * playlists
 * add search
 * add access to settings
 * generate whole order for playlist when switching progression modes - don't include loop? or just go out to set number of songs to start, generate more at a certain point
 * fix that little bit where the time passed indicator for the song and also the audio slider is outside the container div to the left
 * add checking if loading or trying to play so it won't throw interrupt errors?
 * preload next song and last songs so the media session thing doesn't go away?

https://drive.google.com/open?id=1AUR-uvIKe4gDWCPweBMEWgchS3x6H9Yj
https://drive.google.com/open?id=17rRW4IOaSCzdKFcyraTlQ8z7m3bmX5aU
 */

'use strict'

const currentAudio = document.getElementById('currentAudio');

const playbtn = document.getElementById('play');
const pausebtn = document.getElementById('pause');
const playPause = document.getElementById('playPause');

const shadow = document.getElementById('shadow');

const songsList = document.getElementById('songsList');
const getList = songsList.getElementsByClassName('li');

const seeSong = document.getElementById('seeSong');

const timeIndicate = document.getElementById('timeIndicate');
const trackTime = document.getElementById('trackTime');
const doneGone = document.getElementById('doneGone');
const seeTime = document.getElementById('seeTime');

const adjustAudio = document.getElementById('adjustAudio');
const showAudioLevel = document.getElementById('showAudioLevel');
const audioSlider = document.getElementById('audioSlider');

const selectionColor = '#b70909'; //background color for selected song

//guess whether it's a mobile device based on whether or not it has a window orientation value
let isMobile = (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);

let getFile;
let upPop = false;
let popup = false;
let editPop = false;
let seeSongs = false;

let passSong;

//for getting things out of localStorage
function gotchem(item, defalt, type = localStorage) {
  let getem = type.getItem(item);
  if (getem !== null && JSON.parse(getem) !== undefined) { return JSON.parse(getem); }
  return defalt;
};

const options = gotchem('options', {
  next: 'next',
  loop: true,
  darkMode: false,
  volume: 1,
  currentSong: 0,
});

let songs = gotchem('songs', []);

let saveTime = gotchem('saveTime', 0);
let unplayed = gotchem('unplayed', songs);

if (options.currentSong > songs.length-1) {
  options.currentSong = 0;
}

//move the song time indicator and update the song time
function indicator() {
  requestAnimationFrame(() => {
    let percent = 100 * (currentAudio.currentTime/currentAudio.duration);
    doneGone.style.width = percent + '%';
    timeIndicate.style.marginLeft = doneGone.offsetWidth + 'px';
  });
  seeTime.textContent = `${toMinutes(currentAudio.currentTime)}/${toMinutes(currentAudio.duration)}`
};

//set up song list and place in song, and set volume to saved level
function draw() {
  currentAudio.src = songs[options.currentSong].song;

  //re-generate song list display
  songsList.innerHTML = '';
  for (let i of songs) {
    let li = document.createElement('li');
    li.classList.add('li')

    let songTitle = document.createElement('span');
    songTitle.classList.add('songTitle');
    songTitle.textContent = i.title;

    let artist = document.createElement('span');
    artist.classList.add('artist');
    artist.textContent = i.artist;

    li.appendChild(songTitle);
    li.appendChild(artist);

    songsList.appendChild(li);
  }
  seeSong.textContent = songs[options.currentSong].title;
  getList[options.currentSong].style.background = selectionColor;

  currentAudio.volume = options.volume;
  showAudioLevel.style.width = options.volume*100 + '%';
};

// to click on a song and have it play, and changes context menu just for the song list (on every click)
function clickList() {
  songsList.addEventListener('click', e => {
    for (let i of getList) {
      i.style.background = '';
    }
    e.target.closest('li').style.background = selectionColor;

    let findTitle = e.target.closest('li').getElementsByClassName('songTitle')[0].textContent;
    let tempSong;
    for (let j of songs) { // get song by title
      if (j.title === findTitle) {
        tempSong = j;
      }
    }
    if (songs[options.currentSong] !== tempSong) { // switch and play
      options.currentSong = songs.indexOf(tempSong) === -1 ? 0 : songs.indexOf(tempSong);
      saveTime = 0;
      currentAudio.currentTime = saveTime;
      currentAudio.src = songs[options.currentSong].song;
      currentAudio.load();
      play();
    }
    else { // don't switch, just play/pause current song
      toggle();
    }
    seeSong.textContent = findTitle;
  }, false);
};

//draw stuff and set up clicking on the songlist
function onStart() {
  draw();
  clickList(); //add event listeners on the songslist
  if (options.darkMode) {
    switchMode(true);
  }
}

//save options and timestamp before unloading
function beforeUnload() {
  saveTime = currentAudio.currentTime;
  localStorage.setItem('saveTime', JSON.stringify(saveTime));
  localStorage.setItem('options', JSON.stringify(options));
}

//switch button image, set title and place in song, and play
function play() {
  if (currentAudio.readyState === 4) {
    navigator.mediaSession.playbackState = 'playing';
    currentAudio.currentTime = saveTime;
    currentAudio.play();
    playbtn.classList.add('none');
    pausebtn.classList.remove('none');
    document.title = `${songs[options.currentSong].title} - Musicorae`;
    navigator.mediaSession.metadata = new MediaMetadata ({
      title: songs[options.currentSong].name,
      artist: songs[options.currentSong].artist,
      artwork: [
        { src: 'https://musicorum-1cf0e.firebaseapp.com/icon.png', sizes: '512x512', type: 'image/png' },
      ],
    });
  }
  else {
    currentAudio.addEventListener('canplay', play, {useCapture: false, once: true});
  }
};

//switch button image, pause and save the place in song
function pause() {
  navigator.mediaSession.playbackState = 'paused';
  currentAudio.pause();
  saveTime = currentAudio.currentTime;
  pausebtn.classList.add('none');
  playbtn.classList.remove('none');
  currentAudio.removeEventListener('canplay', play, {useCapture: false, once: true});
};

//toggle play and pause
const toggle = () => currentAudio.paused ? play() : pause();

//convert seconds to a time in minutes and seconds
const toMinutes = time => {
  let minutes = Math.trunc(time/60);
  let seconds = Math.round((Math.trunc(time-minutes*60)/100)*100);
  if (seconds < 10) { seconds = '0' + seconds; }
  return isNaN(seconds) ? '-:--' : minutes+':'+seconds;
}

//get the next song from the current list of songs (for non-repeat and randomization)
function setNextSong(list = songs) {
  saveTime = 0;
  currentAudio.currentTime = saveTime;
  currentAudio.src = list[options.currentSong].song;
  seeSong.textContent = list[options.currentSong].title;
  let getList = songsList.getElementsByTagName('li');
  for (let [i] of songs.entries()) {
    getList[i].style.background = i === options.currentSong ? selectionColor : '';
  }
  currentAudio.load();
  play();
}

//different functions for shuffle, random, etc
const nextTrack = {
  next: () => {
    options.currentSong++;
    if (options.loop && songs[options.currentSong] === undefined) {
      options.currentSong = 0;
    }
    setNextSong();
  },
  shuffle: () => {
    unplayed.splice(options.currentSong, 1);//might not work
    options.currentSong = Math.trunc(Math.random() * unplayed.length);
    setNextSong(unplayed);
  },
  random: () => {
    options.currentSong = Math.trunc(Math.random() * songs.length);
    setNextSong();
  }
};

//to close all modals & stuff
function closeAll() {
  uploadpopup.classList.remove('inlineBlock');
  editSong.classList.remove('inlineBlock');
  contextMenu.classList.add('none');
  shadow.classList.add('none');
  if (upPop) {
    getTitle.value = '';
    getArtist.value = '';
    temptitle = '';
    tempartist = '';
    byUrl.value = '';
    byUrl.disabled = false;
    showFile.textContent = 'No file chosen';
  }
  if (editPop) {
    for (let i of songs) {
      if (passSong.title === i.title) {
        if (editTitle.value !== '') { i.title = editTitle.value; }
        if (editArtist.value !== '') { i.artist = editArtist.value; }
        localStorage.setItem('songs', JSON.stringify(songs));
        saveTime = currentAudio.currentTime;
        draw();
      }
    }
  }
  upPop = false;
  popup = false;
};

//switch light and dark modes
function switchMode(setup = false) {
  !setup && (options.darkMode = !options.darkMode);
  document.documentElement.classList.toggle('dark');
}

//function for scrubbing around in a song
function moveIndicator(e) {
  e.preventDefault();
  let clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
  let newTime = clientX - trackTime.offsetLeft;
  let timePercent = newTime/trackTime.offsetWidth;
  saveTime = timePercent*currentAudio.duration || 0;
  currentAudio.currentTime = saveTime;
};

//function for dragging to adjust sound
function audioMoveIndicator(e) {
  e.preventDefault();
  let clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
  let newVolume = clientX - adjustAudio.offsetLeft;
  let volumePercent = Math.round(Math.max(0, Math.min(newVolume/adjustAudio.offsetWidth, 1))*100)/100;
  showAudioLevel.style.width = volumePercent*100 + '%';
  currentAudio.volume = volumePercent;
  options.volume = volumePercent;
};

currentAudio.addEventListener('loadedmetadata', () => {//show correct place on reload and open
  currentAudio.currentTime = saveTime;
  indicator();
}, false);

//for media session controls
navigator.mediaSession.setActionHandler('play', () => {
  playbtn.classList.add('none');
  pausebtn.classList.remove('none');
  navigator.mediaSession.playbackState = 'playing';
  play();
}, false);

navigator.mediaSession.setActionHandler('pause', () => {
  saveTime = currentAudio.currentTime;
  pausebtn.classList.add('none');
  playbtn.classList.remove('none');
  navigator.mediaSession.playbackState = 'paused';
  pause();
}, false);

let temptitle;
let tempartist;

//most click actions
document.addEventListener('click', e => {
  let t = e.target;
  if (t.closest('#playPause')) { //play/pause
    toggle();
  }
  else if (t.matches('#modebtn')) { //switch light/dark modes
    switchMode();
  }
  else if (t.matches('#closeEdit')) { //close the edit modal
    closeAll();
  }
  else if (t.matches('#songsbtn')) { //show/hide songs list (only on small screens)
    seeSongs ? songsList.style.display = 'none' : songsList.style.display = 'initial';
    seeSongs = !seeSongs;
  }
  if (window.innerWidth <= 420 && seeSongs && !t.closest('#songsList') && !t.matches('#songsbtn')) { //hide songs list (only on small screens)
    songsList.style.display = 'none';
    seeSongs = false;
  }
}, false);

//try to get title and artist when a file is picked
file.addEventListener('change', () => {
  getFile = file.files[0];
  showFile.textContent = getFile.name;
  let getnames = (getFile.name.slice(0, -4)).split(' - ');
  if (getnames[1] !== undefined) {
    temptitle = getnames[1];
    tempartist = getnames[0];
    getArtist.value = tempartist;
  }
  else {
    temptitle = getFile.name.slice(0, -4); //-4 to get rid of file extension
    tempartist = 'Unknown';
  }
  getTitle.value = temptitle;
  byUrl.disabled = true;
}, false);

//update the thingambob that shows where you are in the song every time the song advances
currentAudio.addEventListener('timeupdate', indicator, false);

//for scrubbing to make it work with mouse and touch
let whichDown = isMobile ? 'touchstart' : 'mousedown';
let whichMove = isMobile ? 'touchmove' : 'mousemove';
let whichUp = isMobile ? 'touchend' : 'mouseup';

//click/tap to place in track
trackTime.addEventListener('click', moveIndicator, false);
adjustAudio.addEventListener('click', audioMoveIndicator, false);

//add event listeners to drag to place in track and drag to adjust sound
timeIndicate.addEventListener(whichDown, () => {
  document.addEventListener(whichMove, moveIndicator, { passive: false });
}, false);

adjustAudio.addEventListener(whichDown, () => {
  document.addEventListener(whichMove, audioMoveIndicator, { passive: false });
}, false);

//close modals and custom context menu
document.addEventListener(whichDown, e => {
  if (!e.target.closest('.popup') && popup) {
    closeAll();
  }
  if (!e.target.closest('#contextMenu')) {
    contextMenu.classList.add('none');
  }
}, false);

//remove move event listeners for performance
document.addEventListener(whichUp, () => {
  document.removeEventListener(whichMove, moveIndicator, { passive: false });
  document.removeEventListener(whichMove, audioMoveIndicator, { passive: false });
}, false);

currentAudio.addEventListener('ended', nextTrack[options.next], false);

navigator.mediaSession.setActionHandler('nexttrack', nextTrack[options.next]); //skip to next track);

navigator.mediaSession.setActionHandler('previoustrack', () => {
  if (currentAudio.currentTime > 1) {
    currentAudio.currentTime = 0;
  }
  else { //temporary, only does songs in order they are in the songs array
    options.currentSong--;
    if (options.currentSong < 0 && options.loop) {
      options.currentSong = songs.length-1;
    }
    setNextSong();
  }
});

//keyboard shortcuts
document.addEventListener('keydown', e => {
  let k = e.keyCode;
  if (k === 27) { closeAll(); } //escape modals
  if (!popup) {
    if (k === 32 && !document.activeElement.matches('#playPause')) { toggle(); } //space to play/pause
    if (k === 77) { switchMode(); } //M to switch modes
    if (k === 39) { currentAudio.currentTime += 5; } //arrow keys to seek forward/back 5 seconds
    if (k === 37) { currentAudio.currentTime -= 5; }
  }
}, false);

window.addEventListener('load', onStart, false);
window.addEventListener('resize', indicator, false); //move the time indicator so it still lines up right
window.addEventListener('beforeunload', beforeUnload, false);

//clear localStorage and everything - just for testing
document.getElementById('clearall').addEventListener('click', () => {
  options.currentSong = 0;
  localStorage.clear();
  sessionStorage.clear();
  window.removeEventListener('beforeunload', beforeUnload, false);
  location.reload();
  console.log('Cleared!');
}, false);