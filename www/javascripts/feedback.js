var feedback = {
  init: function() {
    this.view.init();
  },
  show: function() {
    this.view.show();
    this.view.hideSuccess();
  },
  hide: function() {
    this.view.hide();
  },
  post: function(data) {
    var self = this;
    console.log(data);
    utils.post('/feedback', data, function(err, response) {
      if (err) return;
      self.view.showSuccess();
    });
  }
};

feedback.view = {
  init: function() {
    this.element = document.getElementById('feedback');
    this.closeButton = document.getElementById('feedback-close');
    this.form = document.getElementById('feedback-form');
    this.success = document.getElementById('feedback-success');
    this.addEventListeners();
  },
  addEventListeners: function() {
    this.closeButton.addEventListener('click', function(event) {
      app.hideOverlay();
    });

    this.form.addEventListener('submit', function(event) {
      event.preventDefault();
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
  }
};
