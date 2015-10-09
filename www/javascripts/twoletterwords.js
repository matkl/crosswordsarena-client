var twoLetterWords = {
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

twoLetterWords.view = {
  init: function() {
    this.element = document.getElementById('two-letter-words');
    this.closeButton = document.getElementById('two-letter-words-close');
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
