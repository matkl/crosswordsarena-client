var app = {
  init: function() {
    this.view.init();

    window.t = translator(JSON.parse(document.getElementById('translations').innerHTML));
    this.state.version = document.getElementById('version').textContent;

    // Initialize connection to server
    socket.init();

    sound.init();
    music.init();

    menu.init();
    sideBar.init();

    // Initialize screen presenters
    start.init();
    lobby.init();
    game.init();

    // Initialize overlay presenters
    about.init();
    leaderboard.init();
    twoLetterWords.init();
    keyboard.init();
    feedback.init();
    challenges.init();

    chat.init();

    // Load settings from local storage
    this.loadSettings();
  },
  cordovaInit: function() {
    // quick and dirty
    this.setHost('http://' + document.getElementById('host').innerHTML);

    this.init();

    this.view.addCordovaEventListeners();
  },
  showOverlay: function(name, pop) {
    this.hideOverlay(true);
    this.view.showOverlay();
    window[name].show();

    /*if (!pop) {
      history.pushState({
        overlay: name
      }, '');
    }*/
  },
  hideOverlay: function(pop) {
    var overlays = [ menu, about, leaderboard, twoLetterWords, keyboard, feedback, challenges ];
    overlays.forEach(function(overlay) {
      overlay.hide();
    });

    this.view.hideOverlay();
    game.focus();

    /*if (!pop) {
      history.pushState({
      }, '');
    }*/
  },
  back: function() {
    this.hideOverlay();
    sideBar.hide();
    game.hidePassDialog();
  },
  setMute: function(value) {
    sound.setMute(value);
    storage.setItem('mute', value);
    menu.setMute(value);
  },
  setMuteMusic: function(value) {
    music.setMute(value);
    storage.setItem('muteMusic', value);
    menu.setMuteMusic(value);
  },
  getMute: function() {
    return sound.getMute();
  },
  getMuteMusic: function() {
    return music.getMute();
  },
  toggleMute: function() {
    this.setMute(!this.getMute());
  },
  toggleMuteMusic: function() {
    this.setMuteMusic(!this.getMuteMusic());
  },
  toggleWoodTheme: function() {
    var className = 'theme-wood';
    document.body.classList.toggle(className);
    var value = document.body.classList.contains(className);
    storage.setItem('woodTheme', value);
    menu.setWoodTheme(value);
  },
  setGuestName: function(name) {
    var name = name || '';
    start.setGuestName(name);
  },
  resize: function() {
    game.resize();
  },
  loadSettings: function() {
    function generateRandomDigit() {
      return Math.floor(Math.random()*10);
    }

    function generateRandomGuestName() {
      var ndigits = 4;
      var name  = t('Guest') + '#';

      for (var i = 0; i < ndigits; i++) {
        name += generateRandomDigit();
      }

      return name;
    }

    var defaults = {
      mute: false,
      muteMusic: false,
      woodTheme: false
    };

    var settings = {};
    settings.mute = storage.getItem('mute');
    settings.muteMusic = storage.getItem('muteMusic');
    settings.woodTheme = storage.getItem('woodTheme');
    settings.guestName = storage.getItem('guestName');

    if (!settings.guestName) {
      // fallback for old version
      settings.guestName = storage.getItem('guest-name');
    }

    if (!settings.guestName) {
      settings.guestName = generateRandomGuestName();
    }

    for (var i in settings) {
      if (settings[i] == null) {
        settings[i] = defaults[i];
      }
    }

    this.setMute(settings.mute);
    this.setMuteMusic(settings.muteMusic);
    this.setGuestName(settings.guestName);

    if (settings.woodTheme) {
      document.body.classList.add('theme-wood');
    }
    menu.setWoodTheme(settings.woodTheme);
  },
  setClients: function(clients) {
    this.state.clients = clients;
  },
  addClient: function(client) {
    this.state.clients.push(client);
  },
  removeClient: function(clientId) {
    this.state.clients.filter(function(client) {
      return client.id != clientId;
    });
  },
  getClient: function(clientId) {
    for (var i = 0; i < this.state.clients.length; i++) {
      if (this.state.clients[i].id == clientId) return this.state.clients[i];
    }
  },
  setClient: function(client) {
    this.client = client;
    lobby.setClientId(client ? client.id : null);
  },
  getClientId: function() {
    return this.client ? this.client.id : null;
  },
  getUserName: function() {
    return this.client ? this.client.name : null;
  },
  getHost: function() {
    return this.state.host;
  },
  setHost: function(host) {
    this.state.host = host;
  },
  logout: function() {
    socket.write({ type: 'logout' });
  },
  showStart: function() {
    start.show();
    lobby.hide();
    game.hide();
    this.view.hideAppBar();
  },
  showLobby: function() {
    start.hide();
    lobby.show();
    game.hide();
    this.view.showAppBar();
  },
  showGame: function() {
    start.hide();
    lobby.hide();
    game.show();
    this.view.showAppBar({ game: true });
  },
  isFullscreenSupported: function() {
    return this.view.isFullscreenSupported();
  },
  requestFullscreen: function() {
    this.view.requestFullscreen();
  },
  exitFullscreen: function() {
    this.view.exitFullscreen();
  },
  isInFullscreen: function() {
    return this.view.isInFullscreen();
  },
  checkVersion: function(version) {
    if (this.state.version != version) {
      console.log(this.state.version, ' != ', version);
      console.log('Version check failed.');
      this.view.showUpdate();
      return;
    }
    console.log('Version check passed.');
  }
};

app.view = {
  init: function() {
    this.overlay = document.getElementById('overlay');
    this.main = document.getElementById('main');
    this.appBar = document.getElementById('app-bar');
    this.appBarLobby = document.getElementById('app-bar-lobby');
    this.appBarGame = document.getElementById('app-bar-game');

    this.addEventListeners();
  },
  addEventListeners: function() {
    /*window.addEventListener('beforeunload', function(event) {
      if (!app.client) return;
      var confirmationMessage =  t('This will close your connection to Crosswords Arena.');
      event.returnValue = confirmationMessage;
      return confirmationMessage;
    });
    */
    this.overlay.addEventListener('click', function(event) {
      if (event.target == this) {
        app.hideOverlay();
      }
    });

    window.addEventListener('resize', function() {
      app.resize();
    });

    window.addEventListener('keydown', function(event) {
      if (event.keyCode == 27) {
        if (this.overlay.classList.contains('hide')) {
          app.hideOverlay();
          app.showOverlay('menu');
        } else {
          app.hideOverlay();
        }
      }
    });

    window.addEventListener('popstate', function(event) {
      var state = event.state || {};

      if (state.overlay) {
        app.showOverlay(state.overlay, true);
      } else {
        app.hideOverlay(true);
      }
    });


    /*window.addEventListener('popstate', function(event) {
      console.log('popstate', event.state);
      var state = event.state || {};

      app.hideOverlay();
    });*/
  },
  addCordovaEventListeners: function() {
    document.addEventListener('backbutton', function(event) {
      event.preventDefault();
      var handled = app.back();
    });
  },
  getLanguage: function() {
    return document.documentElement.lang;
  },
  showOverlay: function() {
    this.main.classList.add('blur');
    this.overlay.classList.remove('hide');
    this.overlay.focus();
  },
  hideOverlay: function() {
    this.main.classList.remove('blur');
    this.overlay.classList.add('hide');
  },
  showAppBar: function(options) {
    options = options || {};

    this.appBar.classList.remove('hide');
    this.appBarGame.classList.toggle('hide', !options.game);
    this.appBarLobby.classList.toggle('hide', options.game);
  },
  hideAppBar: function() {
    this.appBar.classList.add('hide');
  },
  isFullscreenSupported: function() {
    return document.fullscreenEnabled || document.webkitFullscreenEnabled || document.webkitFullScreenEnabled || document.mozFullscreenEnabled || document.mozFullScreenEnabled;
  },
  requestFullscreen: function() {
    var body = document.body;
    var requestFullscreen = body.requestFullscreen || body.webkitRequestFullscreen || body.webkitRequestFullScreen || body.mozRequestFullscreen || body.mozRequestFullScreen;

    if (requestFullscreen) {
      requestFullscreen.call(body);
    } else {
      console.error('Fullscreen not supported');
    }
  },
  exitFullscreen: function() {
    var exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen || document.webkitExitFullScreen || document.mozExitFullscreen || document.mozExitFullScreen;

    if (exitFullscreen) {
      exitFullscreen.call(document);
    } else {
      console.error('Fullscreen not supported');
    }
  },
  isInFullscreen: function() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.webkitFullScreenElement || document.mozFullscreenElement || document.mozFullScreenElement);
  },
  showUpdate: function() {
    document.getElementById('update').classList.remove('hide');
  }
};

app.state = {
  clients: [],
  fullscreen: false,
  version: null,
  host: ''
};

if (window.cordova) {
  document.addEventListener('deviceready', function() {
    app.cordovaInit();
  });
} else {
  window.addEventListener('DOMContentLoaded', function() {
    app.init();
  });
}
