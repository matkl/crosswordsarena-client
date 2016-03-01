var chat = {
  init: function() {
    this.view.init();
  },
  addMessage: function(message) {
    if (message.className == 'result') {
      var clientId = app.getClientId();
      var playerWins = 0;
      var opponentWins = 0;

      message.players.forEach(function(player) {
        if (player.id == clientId) {
          playerWins = player.wins;
        } else {
          opponentWins = player.wins;
        }
      });

      message.text = playerWins + ' - ' + opponentWins;
    }

    this.view.addMessage(message);
  },
  clear: function() {
    this.view.removeAllMessages();
  },
  scrollToBottom: function() {
    this.view.scrollToBottom();
  },
  enable: function() {
    this.view.enable();
    this.scrollToBottom();
    opponentChat.enable();
  },
  disable: function() {
    this.view.disable();
    this.scrollToBottom();
    opponentChat.disable();
  },
  hasFocus: function() {
    return this.view.hasFocus();
  }
};

chat.view = {
  init: function() {
    this.messages = document.getElementById('chat-messages');
    this.form = document.getElementById('chat-form');
    this.input = document.getElementById('chat-form-input');
    this.inputWrapper = document.getElementById('chat-form-input-wrapper');
    this.button = document.getElementById('chat-form-button');
    this.openChatButton = document.getElementById('more');
    this.toggleOnButton = document.getElementById('chat-toggle-on');
    this.toggleOffButton = document.getElementById('chat-toggle-off');
    this.chatIsOff = document.getElementById('chat-is-off');

    this.addEventListeners();
  },
  addEventListeners: function() {
    var self = this;

    this.form.addEventListener('submit', function(event) {
      event.preventDefault();
      if (this.elements.text.value == '') return;
      this.elements.text.focus();
      socket.write({ type: 'action', action: 'say', text: this.elements.text.value });
      this.elements.text.value = '';
      sound.play('button');
      self.scrollToBottom();
    });

    this.form.addEventListener('keypress', function(event) {
      event.stopPropagation();
    });

    this.form.addEventListener('keydown', function(event) {
      event.stopPropagation();
    });

    this.input.addEventListener('focus', function(event) {
      window.setTimeout(function() {
        chat.scrollToBottom();
      }, 1000);
    });

    this.toggleOnButton.addEventListener('click', function(event) {
      chat.disable();
    });

    this.toggleOffButton.addEventListener('click', function(event) {
      chat.enable();
    });

    window.addEventListener('resize', function(event) {
      chat.scrollToBottom();
    });
  },
  addMessage: function(data) {
    function createMessage(data) {
      var message = document.createElement('p');
      if (data.className) {
        message.className = data.className;
      } else {
        message.className = 'message';
      }

      var name = document.createElement('b');
      name.textContent = data.name;

      var space = document.createTextNode(' ');

      var text = document.createElement('span');
      if (data.html) {
        text.innerHTML = data.html;
      } else {
        text.textContent = data.text;
      }

      if (data.name) {
        message.appendChild(name);
        message.appendChild(space);
      }
      message.appendChild(text);

      return message;
    }

    var scrolledToBottom = utils.scrolledToBottom(this.messages);
    var message = createMessage(data);

    this.messages.appendChild(message);

    if (scrolledToBottom) {
      this.scrollToBottom();
    }

    if (!data.className && !sideBar.isVisible() && !this.messages.classList.contains('chat-off')) {
      this.openChatButton.classList.add('updated');
    }
  },
  removeAllMessages: function(data) {
    this.messages.innerHTML = '';
  },
  scrollToBottom: function() {
    utils.scrollToBottom(this.messages);
  },
  enable: function() {
    this.toggleOnButton.classList.remove('hide');
    this.toggleOffButton.classList.add('hide');
    this.chatIsOff.classList.add('hide');
    this.inputWrapper.classList.remove('hide');

    this.messages.classList.remove('chat-off');
  },
  disable: function() {
    this.toggleOnButton.classList.add('hide');
    this.toggleOffButton.classList.remove('hide');
    this.chatIsOff.classList.remove('hide');
    this.inputWrapper.classList.add('hide');

    this.messages.classList.add('chat-off');
  },
  hasFocus: function() {
    return document.activeElement == this.input;
  }
};

var opponentChat = {
  init: function() {
    this.opponentChat = document.getElementById('opponent-chat');
  },
  hide: function() {
    this.opponentChat.classList.add('hide');
  },
  show: function() {
    this.opponentChat.classList.remove('hide');
  },
  addMessage: function(data) {
    if (!data.text) return;
    if (data.className) return;
    if (game.getOpponentClientId() != data.clientId) return;

    this.removeAllMessages();
    this.opponentChat.classList.remove('fadeOut');

    function createBubble(data) {
      var bubble = document.createElement('div');
      bubble.className = 'opponent-chat-bubble';

      var span = document.createElement('span');
      if (data.text) span.textContent = data.text;
      bubble.appendChild(span);

      return bubble;
    }

    var bubble = createBubble(data);

    this.opponentChat.appendChild(bubble);
  },
  fadeOut: function() {
    this.opponentChat.classList.add('fadeOut');
  },
  removeAllMessages: function() {
    this.opponentChat.innerHTML = '';
  },
  enable: function() {
    this.opponentChat.classList.remove('opponent-chat-off');
  },
  disable: function() {
    this.opponentChat.classList.add('opponent-chat-off');
  }
};
