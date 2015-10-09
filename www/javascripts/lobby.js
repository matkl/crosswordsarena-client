var lobby = {
  init: function() {
    this.view.init();
  },
  show: function() {
    this.view.show();
  },
  hide: function() {
    this.view.hide();
  },
  addClient: function(client) {
    this.view.addClient(client);
  },
  removeClient: function(clientId) {
    this.view.removeClient(clientId);
    this.removeChallenger(clientId);
    this.removeChallenge(clientId);
  },
  removeAllClients: function() {
    this.state.challenges = [];
    this.state.challengers = [];
    this.view.removeAllClients();
  },
  setClients: function(clients) {
    this.removeAllClients();
    clients.forEach(function(client) {
      this.addClient(client);
    }, this);
  },
  addChallenger: function(clientId) {
    if (this.state.challengers.indexOf(clientId) >= 0) return;
    this.state.challengers.push(clientId);
    this.view.toggleChallenger(clientId, true);
  },
  removeChallenger: function(clientId) {
    var index = this.state.challengers.indexOf(clientId);
    if (index < 0) return;
    this.state.challengers.splice(index, 1);

    this.view.toggleChallenger(clientId, false);
  },    
  removeChallenge: function(clientId) {
    var index = this.state.challenges.indexOf(clientId);
    if (index < 0) return;
    this.state.challenges.splice(index, 1);

    this.view.toggleChallenge(clientId, false);
  },
  toggleChallenge: function(clientId) {
    var index = this.state.challenges.indexOf(clientId);

    if (index < 0) {
      this.state.challenges.push(clientId);
      socket.write({ type: 'challenge', targetId: clientId });
      this.view.toggleChallenge(clientId, true);
    } else {
      this.state.challenges.splice(index, 1);
      socket.write({ type: 'unchallenge', targetId: clientId });
      this.view.toggleChallenge(clientId, false);
    }
  },
  clearChallenges: function() {
    this.state.challenges.forEach(function(clientId) {
      this.view.toggleChallenge(clientId, false);
    }, this);
    this.state.challenges = [];
  },
  setClientStatus: function(clientId, status, statusCode) {
    this.view.setClientStatus(clientId, status, statusCode);
  },
  setClientId: function(clientId) {
    this.state.clientId = clientId;
    this.view.setClientId(clientId);
  }
};

lobby.view = {
  init: function() {
    this.element = document.getElementById('lobby');
    this.clients = document.getElementById('clients');
  },
  show: function() {
    this.element.classList.remove('hide');
  },
  hide: function() {
    this.element.classList.add('hide');
  },
  addClient: function(data) {
    var self = this;

    function createClient(data) {
      var client = document.createElement('div');
      client.className = 'lobby-client';
      client.classList.toggle('self', data.id == lobby.state.clientId);
      client.classList.toggle('guest', data.type == 'guest');
      client.classList.toggle('available', data.statusCode < 400);
      client.setAttribute('data-id', data.id);

      client.addEventListener('click', function() {
        //this.classList.toggle('is-inspected');
      });

      var front = document.createElement('div');
      front.className = 'lobby-client-face lobby-client-front';

      var picture = document.createElement(data.picture ? 'img' : 'div');
      picture.className = 'lobby-client-picture';
      if (data.picture) {
        picture.src = data.picture;
      } else {
        picture.textContent = data.name.charAt(0).toUpperCase();
      }

      var content = document.createElement('div');
      content.className = 'lobby-client-content';

      var details = document.createElement('div');
      details.className = 'lobby-client-details';

      var name = document.createElement('div');
      name.className = 'lobby-client-name';
      name.textContent = data.name;

      var status = document.createElement('div');
      status.className = 'lobby-client-status';
      status.textContent = data.status;

      var challenge = document.createElement('button');
      challenge.className = 'button lobby-client-button lobby-client-challenge';
      challenge.textContent = t('Challenge');
      challenge.addEventListener('click', function(event) {
        ga('send', 'event', 'button', 'click', 'challenge');
        
        event.stopPropagation();
        lobby.toggleChallenge(client.getAttribute('data-id'));
        sound.play('button');
      });

      var unchallenge = document.createElement('button');
      unchallenge.className = 'button lobby-client-button lobby-client-unchallenge';
      unchallenge.textContent = t('Cancel Challenge');
      unchallenge.addEventListener('click', function(event) {
        ga('send', 'event', 'button', 'click', 'unchallenge');

        event.stopPropagation();
        lobby.toggleChallenge(client.getAttribute('data-id'));
        sound.play('button');
      });

      var accept = document.createElement('button');
      accept.className = 'button lobby-client-button lobby-client-accept';
      accept.textContent = t('Accept Challenge');
      accept.addEventListener('click', function(event) {
        ga('send', 'event', 'button', 'click', 'accept');

        event.stopPropagation();
        lobby.toggleChallenge(client.getAttribute('data-id'));
        sound.play('button');
      });

      var back = document.createElement('div');
      back.className = 'lobby-client-face lobby-client-back';

      client.appendChild(front);
      client.appendChild(back);
      front.appendChild(picture);
      front.appendChild(content);
      content.appendChild(details);
      content.appendChild(challenge);
      content.appendChild(unchallenge);
      content.appendChild(accept);
      details.appendChild(name);
      details.appendChild(status);

      return client;
    }

    this.clients.appendChild(createClient(data));
  },
  getClient: function(clientId) {
    return this.clients.querySelector('[data-id="' + clientId + '"]');
  },
  removeClient: function(clientId) {
    this.clients.removeChild(this.getClient(clientId));
  },
  removeAllClients: function() {
    this.clients.innerHTML = '';
  },
  toggleChallenge: function(clientId, challenge) {
    var client = this.getClient(clientId);
    if (client) {
      client.classList.toggle('challenged', challenge);
    }
  },
  toggleChallenger: function(clientId, challenger) {
    var client = this.getClient(clientId);
    if (client) {
      client.classList.toggle('challenger', challenger);
    }
  },
  setClientStatus: function(clientId, status, statusCode) {
    var client = this.getClient(clientId);
    if (client) {
      client.querySelector('.lobby-client-status').textContent = status;
      client.classList.toggle('available', statusCode < 400);
    }
  },
  setClientId: function(clientId) {
    var client = this.getClient(clientId);
    if (client) {
      client.classList.add('self');
    }
  }
};

lobby.state = {
  challenges: [],
  challengers: []
};
