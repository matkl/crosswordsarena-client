var keyboard = {
  init: function() {
    this.view.init();
  },
  show: function() {
    this.view.show();
  },
  hide: function() {
    this.view.hide();
  }
};

keyboard.view = {
  init: function() {
    this.element = document.getElementById('keyboard');
    this.closeButton = document.getElementById('keyboard-close');
    this.addEventListeners();
  },
  addEventListeners: function() {
    this.closeButton.addEventListener('click', function(event) {
      app.hideOverlay();
    });
  },
  show: function() {
    this.element.classList.remove('hide');
  },
  hide: function() {
    this.element.classList.add('hide');
  }
};
