var socket = {
  init: function() {
    var host = app.getHost() || window.location.href;

    console.log('Connecting to ' + host);

    this.primus = new Primus(host);
    this.primus.on('data', this.onData.bind(this));
    this.primus.on('open', this.onOpen.bind(this));
    this.primus.on('end', this.onEnd.bind(this));
    this.primus.on('close', this.onClose.bind(this));
    this.primus.on('reconnect', this.onReconnect.bind(this));
    this.primus.on('reconnect scheduled', this.onReconnectScheduled.bind(this));
  },
  open: function() {
    this.primus.open();
  },
  end: function() {
    this.primus.end();
  },
  write: function() {
    this.primus.write.apply(this.primus, arguments);
  },
  onClose: function() {
    app.setClient(null);
    app.showStart();
    start.showClose();
    menu.setInGame(false);
  },
  onData: function(data) {
    if (!data.type) return;

    console.log(data.type, data.action, data);

    var method = 'onData' + data.type.charAt(0).toUpperCase() + data.type.slice(1);
    if (typeof this[method] == 'function') {
      this[method](data);
    }

    this.emit(data.type, data);
  },
  onDataAction: function(data) {
    switch (data.action) {
      case 'concede': game.concede(data.name); break;
      case 'exchange': game.exchange(data.exchange, data.rack); break;
      case 'finish': game.finish(data); break;
      case 'opponentConcede': game.concede(1, data.name); break;
      case 'opponentPut': game.put(1, data.rackIndex, data.boardIndex, data.tile); break;
      case 'opponentRemove': game.remove(1, data.rackIndex); break;
      case 'opponentRemoveAll': game.removeAll(1); break;
      case 'opponentStatus': game.setStatus(1, data.status, data.statusCode); break;
      case 'pass': game.pass(data); break;
      case 'turn': game.turn(data.playerIndex); break;
      case 'submit': game.submit(data); break;
      case 'message': chat.addMessage(data); opponentChat.addMessage(data); break;
    }
  },
  onDataServer: function(data) {
    app.checkVersion(data.version);
  },
  onDataAlert: function(data) {
    app.alert(t('Server'), data.text);
  },
  onDataChallenge: function(data) {
    lobby.addChallenger(data.sourceId);

    var client = app.getClient(data.sourceId);
    if (client) {
      challenges.addClient(client);
    }
  },
  onDataClient: function(data) {
    app.setClient(data.client);

    if (data.client) {
      app.showLobby();
    } else {
      app.showStart();
      start.showLogin();
    }

    if (data.sid) {
      storage.setItem('session', data.sid);
    }
  },
  onDataClients: function(data) {
    app.setClients(data.clients);
    lobby.setClients(data.clients);
  },
  onDataGame: function(data) {
    if (data.game) {
      lobby.clearChallenges();
      chat.clear();
      sideBar.hide();
      menu.hide();
      app.hideOverlay();

      app.showGame();
      game.load(data.game);
      challenges.hide();
    } else {
      app.showLobby();
    }
    menu.setInGame(!!data.game);
  },
  onDataJoin: function(data) {
    app.addClient(data.client);
    lobby.addClient(data.client);
  },
  onDataLeave: function(data) {
    app.removeClient(data.client);
    lobby.removeClient(data.client.id);
  },
  onDataRegister: function(data) {
    start.requestRegistration(data);
  },
  onDataStatus: function(data) {
    lobby.setClientStatus(data.clientId, data.status, data.statusCode);
  },
  onDataUnchallenge: function(data) {
    lobby.removeChallenger(data.sourceId);
    challenges.removeClient(data.sourceId);
  },
  onDataClearChallenges: function(data) {
    // cancel own challenge
    lobby.removeChallenge(data.id);
  },
  onOpen: function() {
    this.write({ type: 'session', sid: storage.getItem('session') });
  },
  onEnd: function() {
    start.showEnd();
  },
  onReconnect: function() {
    start.showReconnect();
  },
  onReconnectScheduled: function(options) {
    start.showReconnectScheduled(options.scheduled);
  }
};

Emitter(socket);
