var alert = {
  init: function() {
    var self = this;

    this.element = document.getElementById('alert');
    this.title = document.getElementById('alert-title');
    this.message = document.getElementById('alert-message');
    this.ok = document.getElementById('alert-ok');
    this.close = document.getElementById('alert-close');

    this.ok.addEventListener('click', function() {
      app.hideOverlay();
      if (typeof self.onClick == 'function') {
        self.onClick();
      }
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
