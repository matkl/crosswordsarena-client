var menu = {
  init: function() {
    this.view.init();
  },
  show: function() {
    this.update();
    this.view.show();
  },
  hide: function() {
    this.view.hide();
  },
  update: function() {
    this.state.fullscreenSupported = app.isFullscreenSupported();
    this.state.fullscreen = app.isInFullscreen();
    this.view.update();
  },
  setMute: function(value) {
    this.view.setMute(value);
  },
  setMuteMusic: function(value) {
    this.view.setMuteMusic(value);
  },
  setWoodTheme: function(value) {
    this.view.setWoodTheme(value);
  },
  setInGame: function(inGame) {
    this.state.inGame = inGame;
  },
  setGameRunning: function(gameRunning) {
    this.state.gameRunning = gameRunning;
  },
  toggleClaimVictory: function(value) {
    this.state.enableClaimVictory = value;
  }
};

menu.view = {
  init: function() {
    this.element = document.getElementById('menu');

    this.openMenu = document.getElementById('app-bar-menu');

    this.about = document.getElementById('menu-about');
    this.leaderboard = document.getElementById('menu-leaderboard');
    this.twoLetterWords = document.getElementById('menu-two-letter-words');
    this.keyBindings = document.getElementById('menu-key-bindings');
    this.feedback = document.getElementById('menu-feedback');

    this.sound = document.getElementById('menu-sound');
    this.music = document.getElementById('menu-music');
    this.fullscreen = document.getElementById('menu-fullscreen');
    this.woodTheme = document.getElementById('menu-wood-theme');

    this.concede = document.getElementById('menu-concede');
    this.claimVictory = document.getElementById('menu-claim-victory');
    this.leaveGame = document.getElementById('menu-leave-game');
    this.logout = document.getElementById('menu-logout');

    this.addEventListeners();

    this.update();
  },
  addEventListeners: function() {
    this.openMenu.addEventListener('click', function() {
      ga('send', 'event', 'menu', 'click', 'open');

      app.showOverlay('menu');
    });

    this.about.addEventListener('click', function() {
      ga('send', 'event', 'menu', 'click', 'about');

      app.showOverlay('about');
    });

    this.leaderboard.addEventListener('click', function() {
      ga('send', 'event', 'menu', 'click', 'leaderboard');

      app.showOverlay('leaderboard');
    });

    this.twoLetterWords.addEventListener('click', function() {
      ga('send', 'event', 'menu', 'click', 'twoLetterWords');

      app.showOverlay('twoLetterWords');
    });

    this.keyBindings.addEventListener('click', function() {
      ga('send', 'event', 'menu', 'click', 'keyBindings');

      app.showOverlay('keyboard');
    });

    this.feedback.addEventListener('click', function() {
      ga('send', 'event', 'menu', 'click', 'feedback');

      app.showOverlay('feedback');
    });

    this.sound.addEventListener('click', function() {
      ga('send', 'event', 'menu', 'click', 'mute');

      app.toggleMute();
    });

    this.music.addEventListener('click', function() {
      ga('send', 'event', 'menu', 'click', 'muteMusic');

      app.toggleMuteMusic();
    });

    this.fullscreen.addEventListener('click', function() {
      ga('send', 'event', 'menu', 'click', 'fullScreen');

      if (menu.state.fullscreen) {
        app.exitFullscreen();
      } else {
        app.requestFullscreen();
      }
      menu.update();
    });

    this.woodTheme.addEventListener('click', function() {
      ga('send', 'event', 'menu', 'click', 'woodTheme');

      app.toggleWoodTheme();
    });

    this.concede.addEventListener('click', function() {
      ga('send', 'event', 'menu', 'click', 'concede');

      game.requestConcede(function() {
        app.hideOverlay();
      });
    });

    this.claimVictory.addEventListener('click', function() {
      ga('send', 'event', 'menu', 'click', 'claimVictory');

      game.requestClaimVictory();
      app.hideOverlay();
    });

    this.leaveGame.addEventListener('click', function() {
      ga('send', 'event', 'menu', 'click', 'leaveGame');

      game.requestLeave(function() {
        app.hideOverlay();
      });
    });

    this.logout.addEventListener('click', function() {
      ga('send', 'event', 'menu', 'click', 'logout');

      if (window.confirm(t('Are you sure?'))) {
        app.hideOverlay();
        app.logout();
      }
    });

    var buttons = document.querySelectorAll('[data-action="openChatMenu"]');
    Array.prototype.forEach.call(buttons, function(button) {
      button.addEventListener('click', function() {
        ga('send', 'event', 'button', 'click', 'menu');

        app.showOverlay('menu');
      });
    });
  },
  show: function() {
    this.element.classList.remove('hide');
  },
  hide: function() {
    this.element.classList.add('hide');
  },
  setMute: function(value) {
    this.sound.classList.toggle('is-enabled', !value);
  },
  setMuteMusic: function(value) {
    this.music.classList.toggle('is-enabled', !value);
  },
  setWoodTheme: function(value) {
    this.woodTheme.classList.toggle('is-enabled', value);
  },
  update: function() {
    this.fullscreen.classList.toggle('hide', !menu.state.fullscreenSupported);
    this.concede.classList.toggle('hide', !(menu.state.inGame && menu.state.gameRunning));
    this.leaveGame.classList.toggle('hide', !menu.state.inGame);
    this.fullscreen.classList.toggle('is-enabled', menu.state.fullscreen);
    this.claimVictory.classList.toggle('hide', !menu.state.inGame || !menu.state.gameRunning || !menu.state.enableClaimVictory);
  }
};

menu.state = {
  inGame: false,
  gameRunning: false,
  fullscreen: false,
  fullscreenSupported: false,
  enableClaimVictory: false
};