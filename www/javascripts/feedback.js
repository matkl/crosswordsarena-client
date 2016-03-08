var feedback = {
  init: function() {
    this.view.init();
  },
  show: function() {
    this.view.show();
    this.view.reset();
  },
  hide: function() {
    this.view.hide();
  },
  post: function(data) {
    var self = this;
    var host = app.getHost();
    utils.post(host + '/feedback', data, function(err, response) {
      if (err) {
        self.view.showError();
        self.view.enableSend();
      } else {
        self.view.showSuccess();
      }
    });
  }
};

feedback.view = {
  init: function() {
    this.element = document.getElementById('feedback');
    this.closeButton = document.getElementById('feedback-close');
    this.form = document.getElementById('feedback-form');
    this.success = document.getElementById('feedback-success');
    this.error = document.getElementById('feedback-error');
    this.sendButton = document.getElementById('feedback-send');
    this.addEventListeners();
  },
  addEventListeners: function() {
    var self = this;

    this.closeButton.addEventListener('click', function(event) {
      app.hideOverlay();
    });

    this.form.addEventListener('submit', function(event) {
      event.preventDefault();

      self.sendButton.disabled = true;

      feedback.post({
        name: this.elements.name.value,
        email: this.elements.email.value,
        text: this.elements.text.value
      });
    });
  },
  show: function() {
    this.element.classList.remove('hide');
  },
  hide: function() {
    this.element.classList.add('hide');
  },
  showSuccess: function() {
    this.success.classList.remove('hide');
  },
  hideSuccess: function() {
    this.success.classList.add('hide');
  },
  showError: function() {
    this.error.classList.remove('hide');
  },
  hideError: function() {
    this.error.classList.add('hide');
  },
  reset: function() {
    this.form.elements.name.value = '';
    this.form.elements.email.value = '';
    this.form.elements.text.value = '';

    this.enableSend();
    
    this.hideSuccess();
    this.hideError();
  },
  enableSend: function() {
    this.sendButton.disabled = false;
  }
};

var rateChrome = {
  init: function() {
    var self = this;

    this.element = document.getElementById('rate-chrome');
    this.closeButton = document.getElementById('rate-chrome-close');
    this.appBarButton = document.getElementById('app-bar-rate-chrome');
    this.userName = document.getElementById('rate-chrome-user-name');
    this.feedbackLink = document.getElementById('rate-chrome-feedback');
    this.hideForeverButton = document.getElementById('rate-chrome-hide-forever');

    if (!storage.getItem('hideRateChrome')) {
      if (chrome && chrome.app && chrome.app.isInstalled) {
        var gamesWon = parseInt(storage.getItem('gamesWon'));
        if (gamesWon >= 5) {
          this.appBarButton.classList.remove('hide');
        }
      }
    }

    this.appBarButton.addEventListener('click', function(event) {
      ga('send', 'event', 'button', 'click', 'rateChrome');
      app.showOverlay('rateChrome');
    });

    this.closeButton.addEventListener('click', function(event) {
      app.hideOverlay();
    });

    this.feedbackLink.addEventListener('click', function(event) {
      ga('send', 'event', 'button', 'click', 'rateChromeGotoFeedback');
      app.showOverlay('feedback');
      event.preventDefault();
    });

    this.hideForeverButton.addEventListener('click', function(event) {
      ga('send', 'event', 'button', 'click', 'rateChromeHideForever');
      app.hideOverlay();
      self.hideAppBarButton();
      storage.setItem('hideRateChrome', true);
    });
  },
  show: function() {
    this.element.classList.remove('hide');
    this.userName.textContent = app.getUserName();
  },
  hide: function() {
    this.element.classList.add('hide');
  },
  hideAppBarButton: function() {
    this.appBarButton.classList.add('hide');
  }
};
