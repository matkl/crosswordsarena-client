var options = {
  init: function() {
    this.view.init();
    this.update();
  },
  show: function() {
    this.view.show();
  },
  hide: function() {
    this.view.hide();
  },
  update: function() {
    this.state.fullscreenSupported = app.isFullscreenSupported();
    this.state.vibrateSupported = !!window.navigator.vibrate;
    this.state.inFullscreen = app.isInFullscreen();
    this.view.update();
  },
  setMute: function(value) {
    this.view.setMute(value);
  },
  setMuteMusic: function(value) {
    this.view.setMuteMusic(value);
  },
  setTheme: function(value) {
    this.view.setTheme(value);
  },
  setVibrate: function(value) {
    this.view.setVibrate(value);
  },
  setChatBubbles: function(value) {
    this.view.setChatBubbles(value);
  }
};

options.view = {
  init: function() {
    this.element = document.getElementById('options');
    this.closeButton = document.getElementById('options-close');

    this.sound = document.getElementById('options-sound');
    this.music = document.getElementById('options-music');
    this.vibrate = document.getElementById('options-vibrate');
    this.chatBubbles = document.getElementById('options-chat-bubbles');
    this.fullscreen = document.getElementById('options-fullscreen');
    this.theme = document.getElementById('options-theme');

    this.addEventListeners();
  },
  addEventListeners: function() {
    this.closeButton.addEventListener('click', function(event) {
      app.hideOverlay();
    });

    this.sound.addEventListener('change', function(event) {
      ga('send', 'event', 'options', 'click', 'mute');

      app.setMute(!event.target.checked);
    });

    this.music.addEventListener('change', function(event) {
      ga('send', 'event', 'options', 'click', 'muteMusic');

      app.setMuteMusic(!event.target.checked);
    });

    this.vibrate.addEventListener('change', function(event) {
      ga('send', 'event', 'options', 'click', 'vibrate');

      app.setVibrate(event.target.checked);
      app.vibrate(100);
    });

    this.chatBubbles.addEventListener('change', function(event) {
      ga('send', 'event', 'options', 'click', 'vibrate');

      app.setChatBubbles(event.target.checked);
    });

    this.fullscreen.addEventListener('change', function(event) {
      ga('send', 'event', 'options', 'click', 'fullScreen');

      if (event.target.checked) {
        app.requestFullscreen();
      } else {
        app.exitFullscreen();
      }
      options.update();
    });

    this.theme.addEventListener('change', function(event) {
      ga('send', 'event', 'options', 'click', 'theme', event.target.value);
      app.setTheme(event.target.value);
    });

    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(function(eventName) {
      document.addEventListener(eventName, onFullscreenchange);
    });

    function onFullscreenchange(event) {
      options.update();
    }
  },
  show: function() {
    this.element.classList.remove('hide');
  },
  hide: function() {
    this.element.classList.add('hide');
  },
  setMute: function(value) {
    this.sound.checked = !value;
  },
  setMuteMusic: function(value) {
    this.music.checked = !value
  },
  setTheme: function(value) {
    this.theme.value = value;
  },
  setVibrate: function(value) {
    this.vibrate.checked = value;
  },
  setChatBubbles: function(value) {
    this.chatBubbles.checked = value;
  },
  update: function() {
    this.vibrate.parentNode.classList.toggle('hide', !options.state.vibrateSupported);
    this.vibrate.disabled = !options.state.vibrateSupported;

    this.fullscreen.parentNode.classList.toggle('hide', !options.state.fullscreenSupported);
    this.fullscreen.disabled = !options.state.fullscreenSupported;
    this.fullscreen.checked = options.state.inFullscreen;
  }
};

options.state = {
  fullscreenSupported: false,
  inFullscreen: false
};

