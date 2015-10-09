var about = {
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

about.view = {
  init: function() {
    this.element = document.getElementById('about');
    this.closeButton = document.getElementById('about-close');
    this.addEventListeners();
  },
  addEventListeners: function() {
    this.closeButton.addEventListener('click', function() {
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
