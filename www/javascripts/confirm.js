var confirm = {
  init: function() {
    var self = this;

    this.element = document.getElementById('confirm');
    this.title = document.getElementById('confirm-title');
    this.message = document.getElementById('confirm-message');
    this.ok = document.getElementById('confirm-ok');
    this.cancel = document.getElementById('confirm-cancel');
    this.close = document.getElementById('confirm-close');

    this.ok.addEventListener('click', function() {
      app.hideOverlay();
      if (typeof self.onClick == 'function') {
        self.onClick();
      }
    });

    this.cancel.addEventListener('click', function() {
      app.hideOverlay();
    });

    this.close.addEventListener('click', function() {
      app.hideOverlay();
    });
  },
  show: function() {
    this.element.classList.remove('hide');
  },
  hide: function() {
    this.element.classList.add('hide');
  },
  setTitle: function(title) {
    this.title.textContent = title;
  },
  setMessage: function(message) {
    this.message.textContent = message;
  },
  setOnClick: function(onClick) {
    this.onClick = onClick;
  }
};
