var app = {
  init: function() {
    this.view.init();

    window.t = translator(JSON.parse(document.getElementById('translations').innerHTML));
    this.state.apiVersion = parseInt(document.getElementById('api-version').textContent);

    // Initialize connection to server
    socket.init();

    sound.init();
    music.init();

    menu.init();
    sideBar.init();
    appBar.init();

    // Initialize screen presenters
    start.init();
    lobby.init();
    game.init();

    // Initialize overlay presenters
    options.init();
    about.init();
    leaderboard.init();
    twoLetterWords.init();
    keyboard.init();
    feedback.init();
    challenges.init();
    confirm.init();
    alert.init();

    chat.init();
    opponentChat.init();

    // Load settings from local storage
    this.loadSettings();
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
    var overlays = [ menu, options, about, leaderboard, twoLetterWords, keyboard, feedback, challenges, confirm, alert ];
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
    options.setMute(value);
  },
  setMuteMusic: function(value) {
    music.setMute(value);
    storage.setItem('muteMusic', value);
    options.setMuteMusic(value);
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
  setTheme: function(value) {
    document.body.classList.toggle('theme-glass', value == 'glass');
    document.body.classList.toggle('theme-wood', value == 'wood');
    //document.body.classList.toggle('theme-blue', value == 'blue');
    storage.setItem('theme', value);
    options.setTheme(value);
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
      theme: 'glass',
      vibrate: true,
      chatBubbles: true
    };

    var settings = {};
    settings.mute = storage.getItem('mute');
    settings.muteMusic = storage.getItem('muteMusic');
    settings.theme = storage.getItem('theme');
    settings.vibrate = storage.getItem('vibrate');
    settings.chatBubbles = storage.getItem('chatBubbles');
    settings.guestName = storage.getItem('guestName');

    if (!settings.guestName) {
      // fallback for old version
      settings.guestName = storage.getItem('guest-name');
    }

    /*if (!settings.guestName) {
      settings.guestName = generateRandomGuestName();
    }*/

    for (var i in settings) {
      if (settings[i] == null) {
        settings[i] = defaults[i];
      }
    }

    this.setMute(settings.mute);
    this.setMuteMusic(settings.muteMusic);
    this.setVibrate(settings.vibrate);
    this.setChatBubbles(settings.chatBubbles);
    this.setGuestName(settings.guestName);
    this.setTheme(settings.theme);
  },
  setClients: function(clients) {
    this.state.clients = clients;
  },
  addClient: function(client) {
    this.state.clients.push(client);
  },
  removeClient: function(clientId) {
    this.state.clients = this.state.clients.filter(function(client) {
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
    menu.setLoggedIn(!!client);
    menu.update();

    if (!!client && typeof this.onLogin == 'function') {
      this.onLogin();
    }
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
    appBar.show('start');
  },
  showLobby: function() {
    start.hide();
    lobby.show();
    game.hide();
    appBar.show();
  },
  showGame: function() {
    start.hide();
    lobby.hide();
    game.show();
    appBar.show('game');
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
  setVibrate: function(value) {
    storage.setItem('vibrate', value);
    this.state.vibrate = value;
    options.setVibrate(value);
  },
  setChatBubbles: function(value) {
    storage.setItem('chatBubbles', value);
    this.state.chatBubbles = value;
    options.setChatBubbles(value);
    
    if (value) {
      opponentChat.show();
    } else {
      opponentChat.hide();
    }
  },
  vibrate: function() {
    if (window.navigator.vibrate && this.state.vibrate) {
      window.navigator.vibrate.apply(window.navigator, arguments);
    }
  },
  getApiVersion: function() {
    return this.state.apiVersion;
  },
  confirm: function(title, message, callback) {
    confirm.setTitle(title);
    confirm.setMessage(message);
    confirm.setOnClick(function() {
      if (typeof callback == 'function') callback();
    });
    this.showOverlay('confirm');
  },
  alert: function(title, message, callback) {
    alert.setTitle(title);
    alert.setMessage(message);
    alert.setOnClick(function() {
      if (typeof callback == 'function') callback();
    });
    this.showOverlay('alert');
  },
  increaseGamesWonCounter: function() {
    var count = parseInt(storage.getItem('gamesWon'));
    if (isNaN(count)) count = 0;
    count += 1;
    storage.setItem('gamesWon', count);
  }
};

app.view = {
  init: function() {
    this.overlay = document.getElementById('overlay');
    this.main = document.getElementById('main');
    this.appBar = document.getElementById('app-bar');
    this.appBarLobby = document.getElementById('app-bar-lobby');
    this.appBarGame = document.getElementById('app-bar-game');

    // Enable experimental features for Google Chrome only, for example CSS
    // blur filter. Blur filter is currently bugged on at least Edge and I
    // don't have the possibility to test on every browser.
    var isChromium = !!window.chrome;
    var vendorName = window.navigator.vendor;
    var isOpera = window.navigator.userAgent.indexOf('OPR') > -1;
    var isIEedge = window.navigator.userAgent.indexOf('Edge') > -1;
    if(isChromium && vendorName == 'Google Inc.' && !isOpera && !isIEedge) {
       // is Google Chrome 
      document.documentElement.classList.add('chrome');
    }

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

    // Android Chrome workaround to force scroll to the active input element
    // see: http://stackoverflow.com/questions/23757345/android-does-not-correctly-scroll-on-input-focus-if-not-body-element
    /*window.addEventListener('resize', function() {
      window.setTimeout(function() {
        if (!document.activeElement) return;
        if (document.activeElement.tagName != 'INPUT') return;
        if (typeof document.activeElement.scrollIntoViewIfNeeded != 'function') return;

        document.activeElement.scrollIntoViewIfNeeded();
      }, 0);
    });*/
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
  isFullscreenSupported: function() {
    return !window.cordova && (document.fullscreenEnabled || document.webkitFullscreenEnabled || document.webkitFullScreenEnabled || document.mozFullscreenEnabled || document.mozFullScreenEnabled);
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
    var exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen || document.webkitExitFullScreen || document.mozExitFullscreen || document.mozExitFullScreen || document.mozCancelFullScreen;

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
  host: '',
  vibrate: true,
  chatBubbles: true
};

