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
  }
};

chat.view = {
  init: function() {
    this.messages = document.getElementById('chat-messages');
    this.form = document.getElementById('chat-form');
    this.input = document.getElementById('chat-form-input');
    this.openChatButton = document.getElementById('more');

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
  },
  addMessage: function(data) {
    function createMessage(data) {
      var message = document.createElement('p');
      if (data.className) {
        message.className = data.className;
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

    if (!data.className && !sideBar.isVisible()) {
      this.openChatButton.classList.add('updated');
    }
  },
  removeAllMessages: function(data) {
    this.messages.innerHTML = '';
  },
  scrollToBottom: function() {
    utils.scrollToBottom(this.messages);
  }
};