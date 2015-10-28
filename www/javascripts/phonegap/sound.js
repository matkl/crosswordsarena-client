var sound = {
  init: function() {
    this.mute = false;
    this.media = {};

    this.initSounds([
      { url: 'sounds/tick.m4a', name: 'tick' },
      { url: 'sounds/tock.m4a', name: 'tock' },
      { url: 'sounds/ding.m4a', name: 'ding' },
      { url: 'sounds/menu-click-tish.m4a', name: 'click' },
      { url: 'sounds/menu-click-two-tone.m4a', name: 'turn' },
      { url: 'sounds/success1.m4a', name: 'success1' },
      { url: 'sounds/button.m4a', name: 'button' },
      { url: 'sounds/pizzicato-orchestral-roll-2.m4a', name: 'roll2' },
      { url: 'sounds/pizzicato-orchestral-roll-3.m4a', name: 'roll3' }
    ]);
  },
  initSounds: function(sounds) {
    var self = this;

    this.sounds = {};

    sounds.forEach(function(sound) {
      self.sounds[sound.name] = sound.url;
    });
  },
  play: function(name) {
    function getPhoneGapPath() {
      var path = window.location.pathname;
      path = path.substr(0, path.lastIndexOf('/') + 1);
      return 'file://' + path;
    }

    if (!this.sounds.hasOwnProperty(name)) return;
    if (this.mute) return;

    var media = this.media[name];
    if (!media) {
      media = this.media[name] = new Media(getPhoneGapPath() + this.sounds[name]);
    }
    if (media && typeof media.play == 'function') {
      media.seekTo(0);
      media.play();
    }
  },
  setMute: function(value) {
    this.mute = value;
  },
  getMute: function() {
    return this.mute;
  }
};

var music = {
  init: function() {
    this.mute = false;
    this.playing = false;

    function getPhoneGapPath() {
      var path = window.location.pathname;
      path = path.substr(0, path.lastIndexOf('/') + 1);
      return 'file://' + path;
    }

    function loop(status) {
      if (status === Media.MEDIA_STOPPED) {
        media.play();
      }
    };

    var media = this.element = new Media(getPhoneGapPath() + 'sounds/mystical-film-score-soundscape-wonder.m4a', null, null, loop);
  },
  play: function() {
    if (!this.mute) {
      this.element.play();
    }
    this.playing = true;
  },
  stop: function() {
    this.element.pause();
    this.element.seekTo(0);
    this.playing = false;
  },
  setMute: function(value) {
    this.mute = value;
    if (this.mute) {
      this.element.pause();
      this.element.seekTo(0);
    } else {
      if (this.playing) {
        this.element.play();
      }
    }
  },
  getMute: function() {
    return this.mute;
  }
};    
