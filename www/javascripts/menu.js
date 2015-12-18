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
    this.view.update();
  },
  setInGame: function(inGame) {
    this.state.inGame = inGame;
    this.update();
  },
  setLoggedIn: function(loggedIn) {
    this.state.loggedIn = loggedIn;
    this.update();
  },
  setGameRunning: function(gameRunning) {
    this.state.gameRunning = gameRunning;
    this.update();
  },
  toggleClaimVictory: function(value) {
    this.state.enableClaimVictory = value;
  }
};

menu.view = {
  init: function() {
    this.element = document.getElementById('menu');

    this.openMenu = document.getElementById('app-bar-menu');

    this.options = document.getElementById('menu-options');

    this.about = document.getElementById('menu-about');
    this.leaderboard = document.getElementById('menu-leaderboard');
    this.twoLetterWords = document.getElementById('menu-two-letter-words');
    this.keyBindings = document.getElementById('menu-key-bindings');
    this.feedback = document.getElementById('menu-feedback');

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

    this.options.addEventListener('click', function() {
      ga('send', 'event', 'menu', 'click', 'options');

      app.showOverlay('options');
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

      app.confirm(t('Logout'), t('Are you sure you want to log out?'), function() {
        app.hideOverlay();
        app.logout();
      });
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
  update: function() {
    this.concede.classList.toggle('hide', !(menu.state.inGame && menu.state.gameRunning));
    this.leaveGame.classList.toggle('hide', !menu.state.inGame);
    this.claimVictory.classList.toggle('hide', !menu.state.inGame || !menu.state.gameRunning || !menu.state.enableClaimVictory);
    this.logout.classList.toggle('hide', !menu.state.loggedIn);
  }
};

menu.state = {
  inGame: false,
  gameRunning: false,
  enableClaimVictory: false
};