// TODO: merge this with 'chat'

var sideBar = {
  init: function() {
    this.view.init();
  },
  show: function() {
    this.view.show();
    chat.scrollToBottom();
  },
  hide: function() {
    this.view.hide();
  },
  isVisible: function() {
    return this.view.isVisible();
  }
};

sideBar.view = {
  init: function() {
    this.element = document.getElementById('chat');
    this.openButton = document.getElementById('more');
    this.close = document.getElementById('chat-close');
    this.overlay = document.getElementById('chat-overlay');

    this.addEventListeners();
  },
  addEventListeners: function() {
    this.close.addEventListener('click', function() {
      sideBar.hide();
    });

    this.overlay.addEventListener('click', function() {
      sideBar.hide();
    });
  },
  show: function() {
    this.element.classList.remove('hide');
    this.overlay.classList.remove('hide');
    this.openButton.classList.remove('updated');
  },
  hide: function() {
    this.element.classList.add('hide');
    this.overlay.classList.add('hide');
  },
  isVisible: function() {
    return !this.element.classList.contains('hide');
  }
};
