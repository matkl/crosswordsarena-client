var start = {
  reconnectTimeoutId: 0,
  init: function() {
    this.view.init();
    this.view.toggleMessage(t('Connecting to server...'))
    this.view.setGuestName(storage.getItem('guest-name') || '');

    var hideCookieConsent = storage.getItem('hideCookieConsent');
    if (hideCookieConsent) {
      this.view.hideCookieConsent();
    }

    //this.fetchNewestBlogPost();
  },
  show: function() {
    this.hideOverlay();
    this.view.show();
  },
  hide: function() {
    this.view.hide();
  },
  showClose: function() {
    this.view.toggleLogin(false);
    this.view.toggleMessage(t('Connection closed.'));
    this.view.toggleReconnectButton(false);
  },
  showEnd: function() {
    this.view.toggleLogin(false);
    this.view.toggleMessage(false);
    this.view.toggleReconnectButton(true);
  },
  showReconnectScheduled: function(scheduled) {
    this.view.toggleLogin(false);
    this.setReconnectTimeout(scheduled);
    this.view.toggleReconnectButton(false);
  },
  showReconnect: function() {
    this.view.toggleLogin(false);
    this.view.toggleMessage(t('Reconnecting...'));
    this.view.toggleReconnectButton(false);
  },
  showLogin: function() {
    this.view.toggleLogin(true);
    this.view.toggleMessage(false);
    this.view.toggleReconnectButton(false);
  },
  loginAsGuest: function(name) {
    socket.write({ type: 'login', name: name });
  },
  loginWithGoogle: function() {
    if (!gapi) return;

    function callback(authResult) {
      // if (authResult['status']['signed_in']) {
        console.log(authResult);
      if (authResult.status.signed_in && authResult.code) {
        socket.write({ type: 'login', provider: 'google', code: authResult.code });
        // Update the app to reflect a signed in user
        // Hide the sign-in button now that the user is authorized, for example:
        console.log('SIGNED IN');
      } else {
        // Update the app to reflect a signed out user
        // Possible error values:
        //   "user_signed_out" - User is signed-out
        //   "access_denied" - User denied access to your app
        //   "immediate_failed" - Could not automatically log in the user
        console.log('Sign-in state: ' + authResult['error']);
      }
    }

    gapi.auth.signIn({ callback: callback });
  },
  requestGuestName: function() {
    this.showOverlay('guestLogin');
  },
  requestRegistration: function(data) {
    if (data.provider == 'google') {
      this.showOverlay('newGoogleAccount', data.error);
    }
  },
  register: function(provider, name) {
    socket.write({ type: 'register', provider: provider, name: name });
  },
  reconnect: function() {
    socket.open();
  },
  setGuestName: function(name) {
    this.view.setGuestName(name);
  },
  setReconnectTimeout: function(timeout) {
    var self = this;

    var start = Date.now();
    var end = Date.now() + timeout;
    var remaining;

    function update() {
      remaining = end - Date.now();
      var seconds = Math.round(remaining / 1000);
      if (seconds < 0) seconds = 0;
      self.view.toggleMessage(t(seconds == 1 ? 'Reconnecting in %d second.' : 'Reconnecting in %d seconds.', seconds));
    }

    self.clearReconnectTimeout();
    update();

    self.reconnectTimeoutId = window.setTimeout(function fn() {
      update();
      if (remaining > 1000) self.reconnectTimeoutId = window.setTimeout(fn, 1000);
    }, 1000);
  },
  clearReconnectTimeout: function() {
    if (this.reconnectTimeoutId > 0) {
      window.clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = 0;
    }
  },
  showOverlay: function(name, error) {
    this.view.showOverlay(name, error);
  },
  hideOverlay: function() {
    this.view.hideOverlay();
  },
  fetchNewestBlogPost: function() {
    var self = this;
    utils.getJSON('http://crosswordsarena.com/api/blog/newest', function(err, post) {
      if (err) return;
      if (!post || typeof post != 'object') return;
      self.view.setNewestBlogPost(post);
    });
  }
};

start.view = {
  init: function() {
    this.element = document.getElementById('start');
    this.playAsGuestButton = document.getElementById('start-play-as-guest-button');
    this.guestLoginForm = document.getElementById('start-guest-login-form');
    this.reconnectButton = document.getElementById('start-reconnect-button');
    this.guestLoginBeta = document.getElementById('start-guest-login-beta');
    this.blog = document.getElementById('start-blog');
    this.blogContent = document.getElementById('start-blog-content');
    this.login = document.getElementById('start-login');
    this.message = document.getElementById('start-message');
    this.end = document.getElementById('start-end');
    this.cookieConsent = document.getElementById('cookie-consent');
    this.cookieConsentClose = document.getElementById('cookie-consent-close');

    this.overlay = document.getElementById('start-overlay');
    this.overlays = {
      guestLogin: document.getElementById('start-guest-login')
    };

    this.addEventListeners();
  },
  addEventListeners: function() {
    var self = this;
    
    /*this.signInWithGoogleButton.addEventListener('click', function(event) {
      start.loginWithGoogle();
    });*/

    this.playAsGuestButton.addEventListener('click', function(event) {
      start.requestGuestName();
    });

    /*this.newGoogleAccountForm.addEventListener('submit', function(event) {
      event.preventDefault();

      var error = self.overlays.newGoogleAccount.querySelector('.error');
      if (error) error.classList.add('hide');

      start.register('google', this.elements.name.value);
    });*/

    this.guestLoginForm.addEventListener('submit', function(event) {
      ga('send', 'event', 'button', 'click', 'guestLogin');

      event.preventDefault();
      var value = this.elements.name.value;
      start.loginAsGuest(value);
      storage.setItem('guestName', value);
    });

    this.reconnectButton.addEventListener('click', function(event) {
      ga('send', 'event', 'button', 'click', 'reconnect');

      start.reconnect();
    });

    /*this.overlay.addEventListener('click', function(event) {
      if (event.target == this) {
        start.hideOverlay();
      }
    });*/

    Array.prototype.forEach.call(this.overlay.querySelectorAll('.window-close'), function(button) {
      button.addEventListener('click', function() {
        start.hideOverlay();
      });
    });

    this.guestLoginBeta.addEventListener('submit', function(event) {
      ga('send', 'event', 'button', 'click', 'guestLogin');

      event.preventDefault();
      var value = this.elements.name.value;
      start.loginAsGuest(value);
      storage.setItem('guestName', value);
    });

    this.cookieConsentClose.addEventListener('click', function(event) {
      storage.setItem('hideCookieConsent', true);
      self.hideCookieConsent();
    });
  },
  show: function() {
    this.element.classList.remove('hide');
  },
  hide: function() {
    this.element.classList.add('hide');
  },
  hideCookieConsent: function() {
    this.cookieConsent.classList.add('hide');
  },
  setGuestName: function(name) {
    this.guestLoginForm.elements.name.value = name;
    this.guestLoginBeta.elements.name.value = name;
  },
  toggleMessage: function(str) {
    this.message.classList.toggle('hide', !str);
    this.message.textContent = str ? str : '';
  },
  toggleLogin: function(value) {
    this.login.classList.toggle('hide', !value);
  },
  toggleReconnectButton: function(value) {
    this.end.classList.toggle('hide', !value);
  },
  showDisplay: function(displayName, errorText) {
    for (var i in this.displays) {
      this.displays[i].classList.toggle('hide', i != displayName);
    }

    var error = this.displays[displayName].querySelector('.error');
    if (error) {
      error.classList.toggle('hide', !errorText);
      error.textContent = errorText;
    }
  },
  showOverlay: function(name, error) {
    this.overlay.classList.remove('hide');
    for (var i in this.overlays) {
      this.overlays[i].classList.toggle('hide', i != name);
    }

    if (name == 'guestLogin') {
      this.guestLoginForm.elements.name.focus();
    }
  },
  hideOverlay: function() {
    this.overlay.classList.add('hide');
  },
  setNewestBlogPost: function(post) {
    function createBlogPost(post) {
      var article = document.createElement('article');
      article.className = 'start-blog-post';
      
      var header = document.createElement('header');
      article.appendChild(header);
      
      var time = document.createElement('time');
      time.setAttribute('datetime', post.date);
      time.textContent = new Date(post.date).toDateString();
      header.appendChild(time);

      var h1 = document.createElement('h1');
      h1.textContent = post.title;
      header.appendChild(h1);

      var p = document.createElement('p');
      //p.textContent = post.excerpt + ' ';
      article.appendChild(p);

      var a = document.createElement('a');
      a.href = 'http://crosswordsarena.com' + post.permalink;
      a.textContent = 'Read more…';

      if (window.cordova) {
        a.addEventListener('click', function(event) {
          event.preventDefault();
          window.open(this.getAttribute('href'), '_system');
        });
      }

      p.appendChild(a);

      return article;
    }

    this.blogContent.innerHTML = '';
    var article = createBlogPost(post);
    this.blogContent.appendChild(article);

    this.blog.classList.remove('hide');
  }
};
