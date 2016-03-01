var sound = {
  init: function() {
    if (window.AudioContext) {
      this.context = new window.AudioContext();
    } else if (window.webkitAudioContext) {
      this.context = new window.webkitAudioContext();
    }

    if (this.context) {
      this.gainNode = this.context.createGain();
      this.gainNode.connect(this.context.destination);

      this.initSounds([
        { url: 'sounds/tick.m4a', name: 'tick' },
        { url: 'sounds/tock.m4a', name: 'tock' },
        { url: 'sounds/ding.m4a', name: 'ding' },
        { url: 'sounds/menu-click-tish.m4a', name: 'click' },
        { url: 'sounds/menu-click-two-tone.m4a', name: 'turn' },
        { url: 'sounds/success1.m4a', name: 'success1' },
        { url: 'sounds/button.m4a', name: 'button' },
        { url: 'sounds/clock.m4a', name: 'clock', loop: true },
        { url: 'sounds/pizzicato-orchestral-roll-2.m4a', name: 'roll2' },
        { url: 'sounds/pizzicato-orchestral-roll-3.m4a', name: 'roll3' }
      ]);
    }
  },
  initSounds: function(sounds) {
    var self = this;

    this.buffers = {};

    sounds.forEach(function(sound) {
      self.fetch(sound.url, function(err, buffer) {
        if (err) return;
        self.buffers[sound.name] = buffer;
      });
    });
  },
  fetch: function(url, callback) {
    if (!this.context) return;

    var self = this;
    var req = new XMLHttpRequest();
    req.open('GET', url, true);
    req.responseType = 'arraybuffer';

    req.onload = function() {
      if (this.status >= 200 && this.status < 400) {
        self.context.decodeAudioData(req.response, function(buffer) {
          callback(null, buffer);
        });
      } else {
        callback(this.status);
      }
    };

    req.onerror = function() {
      callback(true);
    };

    req.send();
  },
  play: function(name, options) {
    options = options || {};
    if (!this.context || !this.gainNode) return;
    if (!this.buffers.hasOwnProperty(name)) return;

    var source = this.context.createBufferSource();
    source.buffer = this.buffers[name];
    source.connect(this.gainNode);
    source.loop = options.loop;
    source.start(0);
    return source;
  },
  setMute: function(value) {
    if (!this.gainNode) return;
    this.gainNode.gain.value = value ? 0 : 1;
  },
  getMute: function() {
    if (!this.gainNode) return true;
    return this.gainNode.gain.value == 0;
  }
};

var music = {
  init: function() {
    if (!sound.context) return;

    this.gainNode = sound.context.createGain();
    this.gainNode.connect(sound.context.destination);

    this.element = document.getElementById('music');
    this.source = sound.context.createMediaElementSource(this.element);
    this.source.connect(this.gainNode);
  },
  play: function() {
    if (this.element) {
      this.element.play();
    }
  },
  stop: function() {
    if (this.element) {
      this.element.pause();
      this.element.currentTime = 0;
    }
  },
  setMute: function(value) {
    if (!this.gainNode) return;
    this.gainNode.gain.value = value ? 0 : 1;
  },
  getMute: function() {
    if (!this.gainNode) return true;
    return this.gainNode.gain.value == 0;
  }
};    
