var challenges = {
  init: function() {
    this.view.init();
  },
  show: function() {
    this.presentChallenges();
    this.state.opened = true;
    this.view.show();
  },
  hide: function() {
    if (this.state.opened) {
      this.view.toggleImportant(false);
      this.state.opened = false;
    }
    this.view.hide();
  },
  presentClients: function() {
    this.view.removeAllClients();
    this.state.clients.forEach(function(client) {
      this.view.addClient(client);
    });
  },
  addClient: function(client) {
    this.state.clients.push(client);
    this.view.setNumber(this.state.clients.length);
    this.view.addClient(client);
    this.view.toggleImportant(true);
  },
  removeClient: function(clientId) {
    this.state.clients = this.state.clients.filter(function(client) {
      return client.id != clientId;
    });
    console.log('disabling', clientId);
    this.view.removeClient(clientId);
    this.view.setNumber(this.state.clients.length);
  },
  presentChallenges: function() {
    this.view.removeAllClients();
    this.state.clients.forEach(function(client) {
      this.view.addClient(client);
    }, this);
  }
};

challenges.view = {
  init: function() {
    this.element = document.getElementById('challenges');
    this.openButton = document.getElementById('app-bar-challenges');
    this.buttonNumber = document.getElementById('app-bar-challenges-number');
    this.closeButton = document.getElementById('challenges-close');
    this.list = document.getElementById('challenges-list');

    this.addEventListeners();
  },
  addEventListeners: function() {
    this.openButton.addEventListener('click', function(event) {
      app.showOverlay('challenges');
    });

    this.closeButton.addEventListener('click', function(event) {
      app.hideOverlay();
    });
  },
  show: function() {
    this.element.classList.remove('hide');
  },
  hide: function() {
    this.element.classList.add('hide');
  },
  addClient: function(data) {
    function createClient(data) {
      var client = document.createElement('li');
      client.className = 'challenges-client';
      client.setAttribute('data-id', data.id);

      var name = document.createElement('div');
      name.className = 'challenges-client-name';
      name.textContent = data.name;

      var buttons = document.createElement('div');
      buttons.className = 'challenges-client-buttons';

      var accept = document.createElement('button');
      accept.className = 'button button-primary challenges-client-accept';
      accept.textContent = 'Accept';
      accept.addEventListener('click', function(event) {
        this.disabled = true;
        socket.write({ type: 'acceptchallenge', targetId: data.id });
      });

      client.appendChild(name);
      client.appendChild(buttons);
      buttons.appendChild(accept);

      return client;
    }

    var client = this.getClient(data.id);

    if (client) {
      client.classList.remove('disabled');
      client.querySelector('.button').disabled = false;
    } else {
      client = createClient(data);
      this.list.appendChild(client);
    }
  },
  removeClient: function(clientId) {
    var client = this.getClient(clientId);
    if (client) {
      client.classList.add('disabled');
      client.querySelector('.button').disabled = true;
    }
  },
  removeAllClients: function() {
    this.list.innerHTML = '';
  },
  setNumber: function(number) {
    this.openButton.classList.toggle('hide', number == 0);
    this.buttonNumber.textContent = number;
  },
  getClient: function(clientId) {
    for (var i = 0; i < this.list.children.length; i++) {
      if (this.list.children[i].getAttribute('data-id') == clientId) {
        return this.list.children[i];
      }
    }
  },
  toggleImportant: function(value) {
    this.openButton.classList.toggle('important', value);
  }
};

challenges.state = {
  clients: [],
  opened: false
};
