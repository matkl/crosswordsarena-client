/* jshint browser: true, globalstrict: true */

'use strict';

var game = {
  init: function() {
    this.view.init();
    this.cursor = new Cursor();

    this.resize();
  },
  show: function() {
    this.view.show();
  },
  hide: function() {
    this.view.hide();
    music.stop();
  },
  load: function(data) {
    this.view.hideMessage();

    this.state.running = data.running;
    this.state.values = data.values || this.state.values;
    this.state.remaining = data.remaining;
    this.state.board = data.board;
    this.state.players = data.players;

    this.presentBoard();
    this.presentRacks();

    this.view.hidePassDialog();
    this.view.setRemaining(data.remaining);

    var player = this.state.players[0];
    var opponent = this.state.players[1];

    this.state.players.forEach(function(player, index) {
      this.view.setPlayerName(index, player.name || t('Unknown'));
      this.view.setPlayerScore(index, player.score);
      if (player.picture) {
        this.view.setPlayerPicture(index, player.picture);
      } else {
        if (player.name) {
          this.view.setPlayerPicture(index, player.name.charAt(0).toUpperCase());
        } else {
          this.view.setPlayerPicture(index, null);
        }
      }
      this.setStatus(index, player.status || '', player.statusCode);
    }, this);

    this.endTurn();
    if (player.turn) {
      this.startTurn();
    }

    if (this.state.running) {
      this.view.start();
    } else {
      this.view.stop();
      this.cursor.hide();
    }

    menu.setGameRunning(this.state.running);

    this.view.toggleStartButtonDisabled(player.ready);

    this.focus();
    this.view.resize();

    data.messages.forEach(function(message) {
      chat.addMessage(message);
    });

    this.view.setPlayerDelta(0, 0);
    this.view.setPlayerDelta(1, 0);

    music.play({ loop: -1 });
  },
  focus: function() {
    this.view.focus();
  },
  presentBoard: function() {
    this.view.clearBoard();
    for (var i = 0; i < this.state.board.length; i++) {
      var tile = this.state.board[i];
      if (tile) {
        this.view.addBoardTile(i, tile, this.state.values[tile]);
      }
    }
  },
  presentRacks: function() {
    this.state.players.forEach(function(player, playerIndex) {
      this.view.clearRack(playerIndex);

      if (playerIndex == 1) {
        // "hidden" tiles (opponent rack)
        for (var i = 0; i < player.rackLength; i++) {
          this.view.addTile(playerIndex);
        }
      } else {
        // "visible" tiles (player rack)
        player.rack.forEach(function(tile) {
          this.view.addTile(playerIndex, tile, this.state.values[tile]);
        }, this);
      }

      if (player.turn) {
        player.targets.forEach(function(squareIndex, tileIndex) {
          if (squareIndex == null) return;
          var tile = player.rack[tileIndex];
          var value = this.state.values[tile];
          this.view.put(playerIndex, tileIndex, squareIndex, tile, value);
        }, this);
      }

      this.view.fanTiles(playerIndex);
    }, this);
  },
  presentPlayValue: function(playerIndex) {
    // Warning: only working for player, not for opponent.
    var self = this;
    var player = this.state.players[playerIndex];
    var tiles = [];
    var targets = [];

    for (var i = 0; i < player.rack.length; i++) {
      if (player.targets[i] != null) {
        var tile = player.rack[i];
        tiles.push(tile);
        targets.push(player.targets[i]);
      }
    }

    this.check(tiles, targets, null, function(err, words, scores, direction) {
      self.view.setPlayerDelta(playerIndex, scores, true);
    });
  },
  turn: function(playerIndex) {
    this.state.players.forEach(function(player, index) {
      player.targets = [];
      player.turn = playerIndex == index;
    });

    var myTurn = playerIndex == 0;
    if (myTurn) {
      this.startTurn();
    } else {
      this.endTurn();
    }
  },
  startTurn: function() {
    this.unlock();
    this.view.toggleTurn(true);
    this.cursor.show();
    this.showMessage(t('Your Turn'));
    sound.play('turn');
  },
  endTurn: function() {
    this.lock();
    this.view.toggleTurn(false);
    this.view.setPlayerDelta(1, 0);
    this.cursor.hide();
  },
  lock: function() {
    this.state.locked = true;
    this.view.lock();
  },
  unlock: function() {
    this.state.locked = false;
    this.view.unlock();
  },
  requestPut: function(tileIndex, squareIndex) {
    var playerIndex = 0;

    if (this.state.locked) return;
    if (this.state.board[squareIndex]) return;
    if (this.state.players[playerIndex].targets.indexOf(squareIndex) >= 0) return;

    this.put(playerIndex, tileIndex, squareIndex);
    this.presentPlayValue(playerIndex);
    socket.write({ type: 'action', action: 'put', tileIndex: tileIndex, squareIndex: squareIndex });

    return true;
  },
  requestPutLetter: function(letter) {
    var playerIndex = 0;
    var player = this.state.players[playerIndex];

    if (this.state.locked) return;
    
    var tileIndices = [];
    var tileIndex;
    var squareIndex = this.cursor.index;

    if (this.state.board[squareIndex] == letter) {
      this.cursor.next();
      return;
    }

    var index = player.rack.indexOf(letter);
    while (index != -1) {
      tileIndices.push(index);
      index = player.rack.indexOf(letter, index + 1);
    }

    if (tileIndices.length > 0) {
      tileIndex = tileIndices[0];

      // prefer tiles which are not on the board
      for (var i = 0; i < tileIndices.length; i++) {
        var index = tileIndices[i];
        if (player.targets[index] == null) {
          tileIndex = index;
          break;
        }
      }

      this.requestRemoveFrom(this.cursor.index);
      this.requestPut(tileIndex, this.cursor.index);
      this.cursor.next();
    }
  },
  requestRemove: function(tileIndex) {
    var playerIndex = 0;

    if (this.state.locked) return;

    var squareIndex = this.state.players[playerIndex].targets[tileIndex];
    if (squareIndex != null) {
      this.remove(playerIndex, tileIndex);
      this.presentPlayValue(playerIndex);
      this.cursor.index = squareIndex;
      socket.write({ type: 'action', action: 'remove', tileIndex: tileIndex });
      return true;
    }

    return false;
  },
  requestRemoveFrom: function(squareIndex) {
    if (this.state.locked) return;
    this.state.players[0].targets.forEach(function(target, tileIndex) {
      if (target == squareIndex) {
        this.requestRemove(tileIndex);
      }
    }, this);
  },
  requestRemoveAll: function() {
    var playerIndex = 0;
    var player = this.state.players[playerIndex];

    if (!player.turn) return false;

    var removedSomething = false;
    var lowestTarget = Infinity;

    for (var i = 0; i < player.targets.length; i++) {
      if (player.targets[i] == null) continue;
      if (player.targets[i] >= 0) {
        removedSomething = true;
        lowestTarget = Math.min(lowestTarget, player.targets[i]);
        this.remove(playerIndex, i);
      }
    }

    if (removedSomething) {
      socket.write({ type: 'action', action: 'removeAll' });
    }

    if (lowestTarget != Infinity) {
      this.cursor.index = lowestTarget;
    }

    this.presentPlayValue(playerIndex);

    return removedSomething;
  },
  requestSubmit: function() {
    var playerIndex = 0;
    if (!this.state.players[playerIndex].turn) return;

    this.lock();
    this.view.focus();
    socket.write({ type: 'action', action: 'submit' });
  },
  requestCancel: function() {
    var playerIndex = 0;
    if (!this.state.players[playerIndex].turn) return;

    if (!game.requestRemoveAll()) {
      var playerIndex = 0;
      var player = this.state.players[playerIndex];

      this.view.clearPassDialog();

      var order = this.view.getRackOrder(playerIndex);

      player.rack.forEach(function(tile, tileIndex) {
        this.view.addPassDialogTile(tile, this.state.values[tile], order[tileIndex]);
      }, this);
      this.view.showPassDialog();
    } else {
      this.view.focus();
    }
  },
  requestPass: function(tileIndices) {
    socket.write({ type: 'action', action: 'pass', tileIndices: tileIndices });
    game.state.remaining += tileIndices.length;
    game.lock();
  },
  requestStart: function() {
    socket.write({ type: 'action', action: 'ready' });
    this.view.toggleStartButtonDisabled(true);
  },
  requestConcede: function(callback) {
    if (this.view.confirm(t('Are you sure?'))) {
      this.lock();
      socket.write({ type: 'action', action: 'concede' });
      if (callback) callback();
    }
  },
  requestClaimVictory: function() {
    this.lock();
    socket.write({ type: 'action', action: 'claimVictory' });
  },
  requestLeave: function(callback) {
    if (!this.state.running || this.view.confirm(t('Are you sure?'))) {
      socket.write({ type: 'action', action: 'leave' });
      if (callback) callback();
    }
  },
  put: function(playerIndex, tileIndex, squareIndex, tile) {
    var value = tile ? this.state.values[tile] : undefined;
    var player = this.state.players[playerIndex];
    player.targets[tileIndex] = squareIndex;

    if (tile) {
      // reveal hidden tile
      player.rack[tileIndex] = tile;
    }

    this.view.put(playerIndex, tileIndex, squareIndex, tile, value);
    this.view.fanTiles(playerIndex);
    sound.play('tick');
  },
  remove: function(playerIndex, tileIndex) {
    this.state.players[playerIndex].targets[tileIndex] = null;
    this.view.remove(playerIndex, tileIndex);

    if (playerIndex == 1) {
      this.view.hideTile(playerIndex, tileIndex);
    }

    this.view.fanTiles(playerIndex);
    sound.play('tock');
  },
  removeAll: function(playerIndex) {
    this.state.players[playerIndex].targets.forEach(function(squareIndex, tileIndex) {
      this.view.remove(playerIndex, tileIndex);

      if (playerIndex == 1) {
        this.view.hideTile(playerIndex, tileIndex);
      }
    }, this);
    this.state.players[playerIndex].targets = [];
    this.view.fanTiles(playerIndex);
  },
  submit: function(data) {
    var playerIndex = this.state.players[0].turn ? 0 : 1;
    var player = this.state.players[playerIndex];

    if (data.error) {
      this.unlock();
      if (data.error.message) {
        this.showMessage(data.error.message);
      }
      return;
    }

    this.view.clearSubmitted();

    this.view.setPlayerDelta(playerIndex, data.scores);
    this.view.setPlayerDelta(playerIndex == 0 ? 1 : 0, 0);

    var highestTarget = -1;
    var tileIndices = [];

    player.targets.forEach(function(squareIndex, tileIndex) {
      if (squareIndex == null) return;
      if (squareIndex > highestTarget) {
        highestTarget = squareIndex;
      }
      this.state.board[squareIndex] = player.rack[tileIndex];
      tileIndices.push(tileIndex);
    }, this);

    // get all squares to be factored in
    var HORIZONTAL = 0;
    var VERTICAL = 1;
    var squares = [];
    if (highestTarget) {
      // it doesn't matter which square we choose to get all squares in the current column/row
      squares = squares.concat(findOccupiedSquares(highestTarget, data.direction, this.state.board));
    }
    var pDirection = data.direction == HORIZONTAL ? VERTICAL : HORIZONTAL;
    player.targets.forEach(function(target) {
      squares = squares.concat(findOccupiedSquares(target, pDirection, this.state.board));
    }, this);

    function findOccupiedSquares(index, direction, board) {
      var boundaryMin = direction == VERTICAL ? index % 15 : Math.floor(index / 15) * 15;
      var boundaryMax = direction == VERTICAL ? boundaryMin + 14*15 : boundaryMin + 14;
      var step = direction == VERTICAL ? 15 : 1;
      var squares = [];
      var i;

      // Set word start index.
      for (i = index - step; i >= boundaryMin; i -= step) {
        if (!board[i]) break;
      }
      var min = i + step;

      // Set word end index.
      for (i = index + step; i <= boundaryMax; i += step) {
        if (!board[i]) break;
      }
      var max = i - step;

      // Return null for one letter words.
      if (min == max) return null;

      for (i = min; i <= max; i += step) {
        squares.push(i);
      }

      return squares;
    }

    this.view.moveTilesToBoard(playerIndex, player.targets);
    this.view.factorInSquares(squares);
    this.cursor.index = highestTarget;
    this.cursor.vertical = data.direction == 1;
    this.cursor.next();

    if (this.state.players[0].turn) {
      sound.play('success1');
      this.addScore(0, data.scores);
      this.endTurn();
    } else {
      this.addScore(1, data.scores);

      this.state.remaining -= data.draw;
      this.view.setRemaining(this.state.remaining);
      for (var i = 0; i < data.draw; i++) {
        this.view.addTile(playerIndex);
      }
      this.view.fanTiles(playerIndex);
    }

    if (data.rackLength != null) player.rackLength = data.rackLength;
  },
  pass: function() {
    var playerIndex = 0;

    if (!this.state.players[playerIndex].turn) return;

    this.view.removeTiles(playerIndex, this.view.getPassDialogIndices());
    this.endTurn();
  },
  exchange: function(tiles, rack) {
    var playerIndex = 0;

    tiles.forEach(function(tile) {
      this.view.addTile(playerIndex, tile, this.state.values[tile]);
    }, this);
    this.state.players[playerIndex].rack = rack;
    this.state.remaining -= tiles.length;
    this.view.setRemaining(this.state.remaining);
    this.view.fanTiles(playerIndex);
  },
  concede: function(playerIndex) {
    // TODO
  },
  finish: function(data) {
    switch (data.outcome) {
      case 1:
        // we win
        this.showMessage(t('You win'));
        sound.play('roll3');
        break;
      case -1:
        // we lose
        this.showMessage(t('You lose'));
        sound.play('roll2');
        break;
      case 0:
        // tie
        this.showMessage(t('Tie'));
        break;
    }

    this.addScore(0, -data.penalty);
    this.addScore(1, -data.opponentPenalty);
    this.state.running = false;

    this.view.stop();
    this.cursor.hide();
    menu.setGameRunning(false);
    music.stop();
  },
  shuffleTiles: function(playerIndex) {
    this.view.shuffleTiles(playerIndex);
  },
  setStatus: function(playerIndex, status, statusCode) {
    this.state.players[playerIndex].status = status;
    this.view.setPlayerStatus(playerIndex, status);

    if (playerIndex == 1) {
      menu.toggleClaimVictory(statusCode == 201); // offline
    }
  },
  resize: function() {
    this.view.resize();
  },
  check: function(tiles, positions, dictionary, callback) {
    // TODO split this long function (on server and client)
    var self = this;
    var words = [];
    var scores = [];
    var connected = false;
    var direction, pDirection, step, min, max;
    var HORIZONTAL = 0;
    var VERTICAL = 1;
    var i;

    // Get direction of main word.
    if (!positions.length) return callback(true);
    else if (positions.length == 1) direction = HORIZONTAL;
    else if (Math.abs(positions[1] - positions[0]) % 15 === 0) direction = VERTICAL;
    else direction = HORIZONTAL;

    var boundaryMin = direction == VERTICAL ? positions[0] % 15 : Math.floor(positions[0] / 15) * 15;
    var boundaryMax = direction == VERTICAL ? boundaryMin + 14*15 : boundaryMin + 14;

    // Check if all tiles are in the same row/column.
    if (direction == HORIZONTAL) {
      var base = Math.floor(positions[0] / 15) * 15;
      for (i = 1; i < positions.length; i++) {
        if (positions[i] - base >= 15) return callback(true);
      }
      step = 1;
      pDirection = VERTICAL;
    } else {
      var offset = positions[0] % 15;
      for (i = 1; i < positions.length; i++) {
        if (positions[i] % 15 != offset) return callback(true);
      }
      step = 15;
      pDirection = HORIZONTAL;
    }

    // Get start of word and end of word indexes.
    min = positions[0];
    max = positions[0];
    for (i = 1; i < positions.length; i++) {
      if (positions[i] < min) min = positions[i];
      else if (positions[i] > max) max = positions[i];
    }

    // Check for holes.
    for (i = min; i <= max; i += step) {
      if (this.state.board[i]) continue;
      if (positions.indexOf(i) >= 0) continue;
      return callback(true);
    }

    // Extend start and end of word to board tiles.
    for (i = min - step; i >= boundaryMin; i -= step) {
      if (!this.state.board[i]) break;
    }
    min = i + step;
    for (i = max + step; i <= boundaryMax; i += step) {
      if (!this.state.board[i]) break;
    }
    max = i - step;

    /** 
     * Find a word at a given index and direction from the board and given
     * tiles/positions arrays.
     */
    function findWord(index, direction, board, tiles, positions) {
      var boundaryMin = direction == VERTICAL ? index % 15 : Math.floor(index / 15) * 15;
      var boundaryMax = direction == VERTICAL ? boundaryMin + 14*15 : boundaryMin + 14;
      var step = direction == VERTICAL ? 15 : 1;
      var word = '';
      var i;

      // Set word start index.
      for (i = index - step; i >= boundaryMin; i -= step) {
        if (!board[i]) break;
      }
      var min = i + step;

      // Set word end index.
      for (i = index + step; i <= boundaryMax; i += step) {
        if (!board[i]) break;
      }
      var max = i - step;

      // Return null for one letter words.
      if (min == max) return null;

      // Retrieve word from board/tile array
      for (i = min; i <= max; i += step) {
        word += index == i ? tiles[positions.indexOf(i)] : board[i];
        if (board[i]) connected = true;
      }

      return word;
    }

    /**
     * Calculate the score of a word neglecting bonus multipliers.
     */
    function calcScore(word, values) {
      var score = 0;
      for (var i = 0; i < word.length; i++) {
        score += values[word.charAt(i)];
      }
      return score;
    }

    // Find words and calculate scores. (word[0] is the main word)
    var wordMultiplier = 1;
    words[0] = '';
    scores[0] = 0;
    for (i = min; i <= max; i += step) {
      if (this.state.board[i]) {
        words[0] += this.state.board[i];
        scores[0] += this.state.values[this.state.board[i]];
        connected = true;
      } else {
        var tile = tiles[positions.indexOf(i)];
        words[0] += tile;
        scores[0] += this.state.values[tile] * this.state.letterMultipliers[i];
        wordMultiplier *= this.state.wordMultipliers[i];
        var word = findWord(i, pDirection, this.state.board, tiles, positions);
        if (word) {
          words.push(word);
          var score = calcScore(word, this.state.values);
          score += this.state.values[tile] * (this.state.letterMultipliers[i] - 1);
          score *= this.state.wordMultipliers[i];
          scores.push(score);
        }
      }
    }
    scores[0] *= wordMultiplier;

    // Remove one-letter word.
    if (words[0].length == 1) {
      words.shift();
      scores.shift();
    }

    if (!words.length) return callback(true);
    if (!this.state.board[112] && positions.indexOf(112) == -1) return callback(true);
    if (this.state.board[112] && !connected) return callback(true);

    if (dictionary) {
      dictionary.findWords(words, function(err, validWords, invalidWords) {
        if (err) return callback(err);
        if (invalidWords.length > 0) return callback(true);

        callback(null, words, scores, direction);
      });
    } else {
      callback(null, words, scores, direction);
    }
  },
  showMessage: function(message) {
    this.view.showMessage(message);
  },
  addScore: function(playerIndex, delta) {
    if (typeof delta == 'number') {
      delta = [ delta ];
    }

    var total = delta.reduce(function(a, b) {
      return a + b;
    }, 0);
    var player = this.state.players[playerIndex];
    player.score += total;

    this.view.setPlayerScore(playerIndex, player.score);
    this.view.setPlayerDelta(playerIndex, total);
  },
  hidePassDialog: function() {
    this.view.hidePassDialog();
  }
};

game.view = {
  fontSize: 0,
  init: function() {
    this.element = document.getElementById('game');
    this.table = document.getElementById('table');
    this.canvas = document.getElementById('canvas');
    this.dust = document.getElementById('dust');
    this.boardContainer = document.getElementById('board-container');
    this.board = document.getElementById('board');
    this.remaining = document.getElementById('remaining');
    this.remainingNumber = document.getElementById('remaining-number');
    this.remainingText = document.getElementById('remaining-text');
    this.submitButton = document.getElementById('submit');
    this.cancelButton = document.getElementById('cancel');
    this.moreButton = document.getElementById('more');
    this.startButton = document.getElementById('start-game');
    this.leaveButton = document.getElementById('leave-game');
    this.squares = document.getElementById('squares');
    this.actions = document.getElementById('actions');
    this.chat = document.getElementById('chat');
    this.message = document.getElementById('message');
    this.passOverlay = document.getElementById('pass-overlay');
    this.passDialog = document.getElementById('pass-dialog');
    this.passDialogTiles = document.getElementById('pass-dialog-tiles');
    this.passDialogEndTurnButton = document.getElementById('pass-dialog-end-turn');
    this.passDialogCancelButton = document.getElementById('pass-dialog-cancel');
    this.passDialogCloseButton = document.getElementById('pass-dialog-close');

    this.players = [];
    this.players[0] = {
      rack: document.getElementById('rack'),
      unitFrame: document.getElementById('player'),
      name: document.getElementById('player-name'),
      score: document.getElementById('player-score'),
      delta: document.getElementById('player-delta'),
      status: document.getElementById('player-status'),
      picture: document.getElementById('player-picture')
    };
    this.players[1] = {
      rack: document.getElementById('opponent-rack'),
      unitFrame: document.getElementById('opponent'),
      name: document.getElementById('opponent-name'),
      score: document.getElementById('opponent-score'),
      delta: document.getElementById('opponent-delta'),
      status: document.getElementById('opponent-status'),
      picture: document.getElementById('opponent-picture')
    };

    this.rack = this.players[0].rack;

    this.addEventListeners();
  },
  addEventListeners: function() {
    var self = this;

    this.submitButton.addEventListener('click', function() {
      ga('send', 'event', 'button', 'click', 'submit');

      sound.play('button');
      game.requestSubmit();
    });

    this.cancelButton.addEventListener('click', function() {
      ga('send', 'event', 'button', 'click', 'cancel');

      sound.play('button');
      game.requestCancel();
    });

    this.moreButton.addEventListener('click', function() {
      ga('send', 'event', 'button', 'click', 'more');

      sideBar.show();
    });

    this.startButton.addEventListener('click', function() {
      ga('send', 'event', 'button', 'click', 'start');

      sound.play('button');
      game.requestStart();
    });

    this.leaveButton.addEventListener('click', function() {
      ga('send', 'event', 'button', 'click', 'leave');

      sound.play('button');
      game.requestLeave();
    });

    this.passDialogEndTurnButton.addEventListener('click', function() {
      ga('send', 'event', 'button', 'click', 'passDialogEndTurn');
  
      self.passDialogEnd();
    });

    this.passDialogCancelButton.addEventListener('click', function() {
      ga('send', 'event', 'button', 'click', 'passDialogCancel');

      self.passDialogCancel();
    });

    this.passDialogCloseButton.addEventListener('click', function() {
      self.passDialogCancel();
    });

    this.passOverlay.addEventListener('click', function(event) {
      if (event.target == this) {
        self.passDialogCancel();
      }
    });

    this.addMouseEventListeners();
    this.addKeyboardEventListeners();
  },
  addMouseEventListeners: function() {
    var self = this;
    var rack = this.rack;
    var squares = this.squares;
    var moveDistance = 0;
    var lastClientX = 0;
    var lastClientY = 0;
    var offsetX = 0;
    var offsetY = 0;

    function getIndex(tile) {
      return Array.prototype.indexOf.call(rack.children, tile);
    }

    function translate(x, y) {
      return 'translate(' + x + 'px,' + y + 'px)';
    }

    function start(tile, clientX, clientY) {
      tile.classList.add('dragging');
      tile.setAttribute('data-dragging', true);

      if (window.navigator.vibrate) {
        window.navigator.vibrate(20);
      }

      moveDistance = 0;
      lastClientX = clientX;
      lastClientY = clientY;

      var tileRect = tile.getBoundingClientRect();
      var rackRect = rack.getBoundingClientRect();
      offsetX = rackRect.left + tileRect.width / 2;
      offsetY = rackRect.top + tileRect.height / 2;
    }

    function move(tile, clientX, clientY) {
      var dx = clientX - lastClientX;
      var dy = clientY - lastClientY;
      moveDistance += Math.sqrt(dx*dx + dy*dy);
      lastClientX = clientX;
      lastClientY = clientY;

      tile.style.transform = translate(clientX - offsetX, clientY - offsetY);
      tile.style.WebkitTransform = tile.style.transform;
      tile.style.MsTransform = tile.style.transform;

      var squaresRect = squares.getBoundingClientRect();
      var x = Math.floor((lastClientX - squaresRect.left) / squaresRect.width * 15);
      var y = Math.floor((lastClientY - squaresRect.top) / squaresRect.height * 15);

      if (!(x >= 0 && x < 15 && y >= 0 && y < 15)) {
        var pos = Math.max(0, Math.min(6, parseInt((clientX - offsetX + 20) / 40)));
        self.fanTiles(0, pos);
        tile.setAttribute('data-position', pos);
      }
    }

    function end(tile, clientX, clientY) {
      tile.classList.remove('dragging');
      tile.removeAttribute('data-dragging');

      tile.style.transform = '';
      tile.style.WebkitTransform = '';
      tile.style.MsTransform = '';

      if (moveDistance < 20) {
        click(tile);
        return;
      }

      var squaresRect = squares.getBoundingClientRect();
      var x = Math.floor((lastClientX - squaresRect.left) / squaresRect.width * 15);
      var y = Math.floor((lastClientY - squaresRect.top) / squaresRect.height * 15);

      var index = getIndex(tile);

      if (x >= 0 && x < 15 && y >= 0 && y < 15) {
        var squareIndex = x + y * 15;
        if (game.requestPut(index, squareIndex)) {
          game.cursor.index = squareIndex;
          game.cursor.next();
        } else {
          game.requestRemove(index);
        }
      } else {
        game.requestRemove(index);
      }
    }

    function click(tile) {
      var index = getIndex(tile);
      if (index == -1) return;

      if (game.state.players[0].targets[index] != undefined) {
        game.requestRemove(index);
        return;
      }

      if (game.cursor.index >= 0 && game.view.isEmpty(game.cursor.index)) {
        game.requestPut(index, game.cursor.index);

        /// TODO ugly omg
        for (var i = game.cursor.index; game.cursor.vertical ? Math.floor(i / 15) < 15 : i <= Math.floor(game.cursor.index / 15) * 15 + 14; i += game.cursor.vertical ? 15 : 1) {
          if (game.view.isEmpty(i)) {
            game.cursor.index = i;
            break;
          }
        }
        return;
      }
    }

    function rectHasPoint(rect, x, y) {
      return x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom;
    }

    function findTile(clientX, clientY) {
      var tiles = self.rack.children;
      for (var i = 0; i < tiles.length; i++) {
        var tile = tiles[i];
        var rect = tile.getBoundingClientRect();
        if (rectHasPoint(rect, clientX, clientY)) {
          return tile;
        }
      }
    }

    function clickBoard(clientX, clientY) {
      var rect = squares.getBoundingClientRect();

      if (!game.state.players[0].turn || !rectHasPoint(rect, clientX, clientY)) {
        self.dust.classList.add('hide');
        self.dust.style.left = clientX - self.fontSize/2 + 'px';
        self.dust.style.top = clientY - self.fontSize/2 + 'px';
        window.requestAnimationFrame(function() {
          self.dust.classList.remove('hide');
        });
        return;
      }
      var x = Math.floor((clientX - rect.left) / rect.width * 15);
      var y = Math.floor((clientY - rect.top) / rect.height * 15);
      var index = x + y * 15;

      if (game.cursor.index == index) {
        game.cursor.rotate();
      } else {
        game.cursor.index = index;
      }
    }

    this.canvas.addEventListener('mousedown', function(event) {
      if (event.button != 0) return;

      self.hideMessage();

      var clientX = event.clientX;
      var clientY = event.clientY;
      var tile = findTile(clientX, clientY);

      var mousemoveListener = function(event) {
        event.preventDefault();
        move(tile, event.clientX, event.clientY);
      };

      var mouseupListener = function(event) {
        window.removeEventListener('mousemove', mousemoveListener);
        window.removeEventListener('mouseup', mouseupListener);

        end(tile, event.clientX, event.clientY);
      };

      if (tile) {
        start(tile, clientX, clientY);
        window.addEventListener('mousemove', mousemoveListener);
        window.addEventListener('mouseup', mouseupListener);
      } else {
        clickBoard(clientX, clientY);
      }
    });

    this.canvas.addEventListener('touchstart', function(event) {
      event.preventDefault();

      self.hideMessage();

      var touch = event.touches[0];
      var clientX = touch.clientX;
      var clientY = touch.clientY;
      var tile = findTile(clientX, clientY);

      var touchmoveListener = function(event) {
        var touch = event.touches[0];
        var clientX = touch.clientX;
        var clientY = touch.clientY;
        move(tile, clientX, clientY);
      };

      var touchendListener = function(event) {
        window.removeEventListener('touchmove', touchmoveListener);
        window.removeEventListener('touchend', touchendListener);

        var touch = event.changedTouches[0];
        var clientX = touch.clientX;
        var clientY = touch.clientY;
        end(tile, clientX, clientY);
      };

      if (tile) {
        start(tile, clientX, clientY);
        window.addEventListener('touchmove', touchmoveListener);
        window.addEventListener('touchend', touchendListener);
      } else {
        clickBoard(clientX, clientY);
      }
    });
  },
  addKeyboardEventListeners: function() {
    var self = this;

    function onBackspace() {
      if (game.view.isTarget(game.cursor.index) && (game.cursor.vertical ? Math.floor(game.cursor.index / 15) == 14 : game.cursor.index % 15 == 14)) {
        game.requestRemoveFrom(game.cursor.index);
      } else {
        game.cursor.prev();
        game.requestRemoveFrom(game.cursor.index);
      }
    }

    function onDelete() {
      game.requestRemoveFrom(game.cursor.index);
    }

    function onDownArrow() {
      game.cursor.down();
    }

    function onEnd() {
      game.cursor.x = 14;
    }

    function onEnter() {
      game.requestSubmit();
    }

    function onHome() {
      game.cursor.x = 0;
    }

    function onLeftArrow() {
      game.cursor.left();
    }

    function onMinus() {
      game.requestCancel();
    }

    function onPageDown() {
      game.cursor.y = 14;
    }

    function onPageUp() {
      game.cursor.y = 0;
    }

    function onPeriod() {
      game.shuffleTiles(0);
    }

    function onRightArrow() {
      game.cursor.right();
    }

    function onSpace() {
      game.cursor.rotate();
    }

    function onTwo() {
      app.showOverlay('twoLetterWords');
    }

    function onUpArrow() {
      game.cursor.up();
    }

    this.element.addEventListener('keydown', function(event) {
      // always prevent backspace default
      if (event.keyCode == 8) event.preventDefault();

      if (self.isPassDialogVisible()) {
        switch (event.keyCode) {
          case 13: self.passDialogEnd(); break; // enter
          case 27: // escape
            self.passDialogCancel();
            event.stopPropagation();
            break;
        }
        return;
      }

      self.hideMessage();

      switch (event.keyCode) {
        case 8: onBackspace(); break;
        case 13: onEnter(); break;
        case 27: // escape
          if (game.requestRemoveAll()) {
            event.stopPropagation();
          }
          break;
        case 33: onPageUp(); break;
        case 34: onPageDown(); break;
        case 35: onEnd(); break;
        case 36: onHome(); break;
        case 37: onLeftArrow(); break;
        case 38: onUpArrow(); break;
        case 39: onRightArrow(); break;
        case 40: onDownArrow(); break;
        case 46: onDelete(); break;
      }
    });

    this.element.addEventListener('keypress', function(event) {
      var charCode = event.charCode;

      if (self.isPassDialogVisible()) {
        if (charCode == 45) {
          // minus
          self.passDialogCancel();
          return;
        }
        var letter = String.fromCharCode(charCode).toUpperCase();
        self.selectPassDialogLetter(letter);
        return;
      }

      switch (charCode) {
        case 32: onSpace(); return;
        case 45: onMinus(); return;
        case 46: onPeriod(); return;
        case 50: onTwo(); return;
      }

      var letter = String.fromCharCode(charCode).toUpperCase();
      game.requestPutLetter(letter);
    });
  },
  show: function() {
    this.element.classList.remove('hide');
  },
  hide: function() {
    this.element.classList.add('hide');
  },
  focus: function() {
    this.element.focus();
  },
  confirm: function(message) {
    return window.confirm(message);
  },
  createTile: function(letter, value) {
    var rack = this.rack;

    var tile = document.createElement('div');
    tile.className = 'tile';
    if (letter) tile.setAttribute('data-letter', letter);

    tile.classList.toggle('one', value == 1);
    tile.classList.toggle('two', value == 2);
    tile.classList.toggle('three', value == 3);
    tile.classList.toggle('four', value == 4);

    var text = document.createElement('div');
    text.className = 'tile-text';
    if (letter) text.textContent = letter;

    var valueElement = document.createElement('div');
    valueElement.className = 'tile-value';
    if (value) {
      var str = '';
      for (var i = 0; i < value; i++) {
        str += '.';
      }
      valueElement.textContent = str;
    }

    tile.appendChild(text);
    tile.appendChild(valueElement);

    return tile;
  },
  addTile: function(playerIndex, letter, value) {
    var tile = this.createTile(letter, value);
    this.players[playerIndex].rack.appendChild(tile);
  },
  removeTiles: function(playerIndex, tileIndices) {
    var rack = this.players[playerIndex].rack;
    var tiles = Array.prototype.slice.call(rack.children);

    tileIndices.forEach(function(index) {
      rack.removeChild(tiles[index]);
    });
  },
  clearRack: function(playerIndex) {
    var rack = this.players[playerIndex].rack;
    rack.innerHTML = '';
  },
  moveTilesToBoard: function(playerIndex, targets) {
    var rack = this.players[playerIndex].rack;
    var tiles = Array.prototype.slice.call(rack.children);

    targets.forEach(function(squareIndex, tileIndex) {
      if (squareIndex != null) {
        var tile = tiles[tileIndex];

        this.squares.children[squareIndex].appendChild(tile);
        tile.classList.add('is-submitted');
        tile.style.transform = '';
        tile.style.WebkitTransform = '';
        tile.style.MsTransform = '';
        tile.style.fontSize = '';
        tile.removeAttribute('data-target');
        tile.removeAttribute('data-position');
      }
    }, this);
  },
  factorInSquares: function(squareIndices) {
    Array.prototype.forEach.call(this.squares.children, function(square, squareIndex) {
      var tile = square.querySelector('.tile');

      if (tile) {
        tile.classList.remove('is-factored-in');
      }
    });

    var self = this;
    window.requestAnimationFrame(function() {
      Array.prototype.forEach.call(self.squares.children, function(square, squareIndex) {
        var tile = square.querySelector('.tile');

        if (tile) {
          var isFactoredIn = squareIndices.indexOf(squareIndex) >= 0;
          if (isFactoredIn) {
            tile.classList.add('is-factored-in');
          }
        }
      });
    });
  },
  fanTiles: function(playerIndex, holePosition) {
    var rack = this.players[playerIndex].rack;
    var order = [];
    var pos = 0;

    for (var i = 0; i < 7; i++) {
      Array.prototype.forEach.call(rack.children, function(tile) {
        if (tile.getAttribute('data-position') == i) order.push(tile);
      }, this);
    }

    Array.prototype.forEach.call(rack.children, function(tile) {
      if (!tile.hasAttribute('data-position')) order.push(tile);
    }, this);

    order.forEach(function(tile, index) {
      if (pos == holePosition) pos++;
      if (!tile.hasAttribute('data-dragging')) tile.setAttribute('data-position', pos++);
    }, this);
  },
  shuffleTiles: function(playerIndex) {
    var rack = this.players[playerIndex].rack;
    var tiles = Array.prototype.slice.call(rack.children);
    utils.shuffle(tiles);
    tiles.forEach(function(tile, index) {
      tile.setAttribute('data-position', index);
    });
  },
  getRackOrder: function(playerIndex) {
    var player = this.players[playerIndex];
    var rack = player.rack;
    var tiles = Array.prototype.slice.call(rack.children);

    var order = tiles.map(function(tile) {
      return tile.getAttribute('data-position');
    });

    return order;
  },
  clearBoard: function() {
    for (var i = 0; i < this.squares.children.length; i++) {
      var tile = this.squares.children[i].querySelector('.tile');
      if (tile) {
        this.squares.children[i].removeChild(tile);
      }
    }
  },
  clearSubmitted: function() {
    var tiles = this.squares.querySelectorAll('.tile');
    Array.prototype.forEach.call(tiles, function(tile) {
      tile.classList.remove('is-submitted');
    });
  },
  addBoardTile: function(squareIndex, letter, value) {
    var tile = this.createTile(letter, value);
    this.squares.children[squareIndex].appendChild(tile);
  },
  put: function(playerIndex, tileIndex, squareIndex, letter, value) {
    var rack = this.players[playerIndex].rack;
    var rackRect = rack.getBoundingClientRect();
    var tile = rack.children[tileIndex];
    var square = this.squares.children[squareIndex];
    var squareRect = square.getBoundingClientRect();

    tile.setAttribute('data-target', squareIndex);
    var translateX = squareRect.left - rackRect.left;
    var translateY = squareRect.top - rackRect.top;
    var transform = 'translateX(' + translateX + 'px) translateY(' + translateY + 'px)';
    /*if (window.devicePixelRatio >= 2) {
      transform += ' scale(0.5)';
    }*/
    tile.style.transform = transform;
    tile.style.WebkitTransform = transform;
    tile.style.MsTransform = transform;
    tile.style.fontSize = this.fontSize + 'px';

    if (letter) {
      tile.querySelector('.tile-text').textContent = letter;
      var str = '';
      for (var i = 0; i < value; i++) {
        str += '.';
      }
      tile.querySelector('.tile-value').textContent = str;
      tile.classList.toggle('one', value == 1);
      tile.classList.toggle('two', value == 2);
      tile.classList.toggle('three', value == 3);
      tile.classList.toggle('four', value == 4);
    }
  },
  remove: function(playerIndex, tileIndex) {
    var tile = this.players[playerIndex].rack.children[tileIndex];

    tile.removeAttribute('data-target');
    tile.style.transform = '';
    tile.style.WebkitTransform = '';
    tile.style.MsTransform = '';
    tile.style.fontSize = '';
  },
  hideTile: function(playerIndex, tileIndex) {
    var tile = this.players[playerIndex].rack.children[tileIndex];
    tile.querySelector('.tile-text').textContent = '';
    tile.querySelector('.tile-value').textContent = '';
  },
  toggleTurn: function(turn) {
    this.players[0].unitFrame.classList.toggle('active', turn);
    this.players[1].unitFrame.classList.toggle('active', !turn);
  },
  setRemaining: function(number) {
    this.remainingNumber.textContent = number;
    this.remainingText.textContent = t(number == 1 ? 'Letter Remaining' : 'Letters Remaining');
  },
  start: function() {
    this.remaining.classList.remove('hide');

    this.submitButton.classList.remove('hide');
    this.cancelButton.classList.remove('hide');
    this.startButton.classList.add('hide');
    this.leaveButton.classList.add('hide');
  },
  stop: function() {
    this.remaining.classList.add('hide');

    this.submitButton.classList.add('hide');
    this.cancelButton.classList.add('hide');
    this.startButton.classList.remove('hide');
    this.leaveButton.classList.remove('hide');
  },
  lock: function() {
    this.table.setAttribute('data-locked', '');
    this.submitButton.disabled = true;
    this.cancelButton.disabled = true;
  },
  unlock: function() {
    this.table.removeAttribute('data-locked');
    this.submitButton.disabled = null;
    this.cancelButton.disabled = null;
  },
  // TODO
  isEmpty: function(squareIndex) {
    if (this.squares.children[squareIndex].querySelector('.tile')) return false;
    return !this.isTarget(squareIndex);
  },
  isTarget: function(squareIndex) {
    var rack = this.players[0].rack;
    for (var i = 0; i < rack.children.length; i++) {
      if (rack.children[i].getAttribute('data-target') == squareIndex) return true;
    }
    return false;
  },
  resize: function() {
    var self = this;
    var minBorderWidth = 8;
    var minBorderWidth = 0;

    // hide message element to prevent the animation
    this.hideMessage();

    // disable animations for a moment so the tiles are not flying around
    self.element.classList.add('notransition');

    // hide the board so we can calculate our space
    self.board.classList.add('hide');

    // reset offsets
    // we will set these later to full pixels for better quality
    self.board.style.left = '';
    self.board.style.top = '';
    //self.board.style.transform = '';
    self.players.forEach(function(player) {
      player.rack.style.left = '';
      player.rack.style.top = '';
    });

    window.requestAnimationFrame(function() {
      var rect = self.boardContainer.getBoundingClientRect();
      var width = rect.width - minBorderWidth;
      var height = rect.height - minBorderWidth;
      var devicePixelRatio = window.devicePixelRatio || 1;

      self.board.classList.remove('hide');

      //var fontSize = Math.floor(Math.min(20, Math.min(width, height) / 31.5));
      //var fontSize = Math.floor(Math.min(20, Math.min(width, height) / 30));
      var fontSize = Math.floor(Math.min(20, Math.min(width/30, height/31.75)));
      //if (devicePixelRatio >= 2) {
      //  fontSize *= 2;
      //}
      //document.documentElement.classList.toggle('dpr2', devicePixelRatio >= 2);

      self.board.style.fontSize = fontSize + 'px';

      // bigger padding for larger screen sizes
      //var padding = fontSize < 20 ? Math.floor(0.75 * fontSize) : fontSize;
      //self.board.style.padding = padding + 'px ' + (padding + 1) + 'px ' + (padding + 1) + 'px ' + padding + 'px';
      
      self.fontSize = fontSize;

      // snap board to full pixels
      var boardRect = self.board.getBoundingClientRect();
      var offsetLeft = boardRect.left % 1;
      var offsetTop = boardRect.top % 1;
      self.board.style.position = 'relative';
      //self.board.style.left = '-0.5px';
      //self.board.style.left = '-0.5px';
      self.board.style.left = -offsetLeft + 'px';
      self.board.style.top = -offsetTop + 'px';

      var dpOffset = 0;
      if (devicePixelRatio > 1) {
        dpOffset = -0.5;
      }
      //self.board.style.transform = dpOffset < 0 ? 'translateX(' + dpOffset + 'px)' : '';

      // snap racks to full pixels
      self.players.forEach(function(player) {
        var rack = player.rack;
        var rackRect = rack.getBoundingClientRect();
        var offsetLeft = rackRect.left % 1;
        var offsetTop = rackRect.top % 1;
        rack.style.position = 'relative';
        rack.style.left = -offsetLeft + 'px';
        rack.style.top = -offsetTop + 'px';
      });


      // rearrange player tiles on board
      self.players.forEach(function(player) {
        var rackRect = player.rack.getBoundingClientRect();
        Array.prototype.forEach.call(player.rack.children, function(tile) {
          if (tile.hasAttribute('data-target')) {
            var squareIndex = tile.getAttribute('data-target');
            var squareRect = self.squares.children[squareIndex].getBoundingClientRect();
            var translateX = squareRect.left - rackRect.left;
            var translateY = squareRect.top - rackRect.top;
            var transform = 'translateX(' + translateX + 'px) translateY(' + translateY + 'px)';
            /*if (window.devicePixelRatio >= 2) {
              transform += ' scale(0.5)';
            }*/
            tile.style.transform = transform;
            tile.style.WebkitTransform = transform;
            tile.style.MsTransform = transform;
            tile.style.fontSize = fontSize + 'px';
          }
        });
      });

      self.element.classList.remove('notransition');
    });
  },
  toggleStartButtonDisabled: function(disabled) {
    this.startButton.disabled = !!disabled;
  },
  showMessage: function(text) {
    this.message.querySelector('span').textContent = text;
    var message = this.message.cloneNode(true);

    this.message.parentNode.replaceChild(message, this.message);
    this.message = message;
    this.message.classList.remove('hide');
  },
  hideMessage: function() {
    this.message.querySelector('span').textContent = '';
    this.message.classList.add('hide');
  },
  setPlayerName: function(playerIndex, name) {
    this.players[playerIndex].name.textContent = name;
  },
  setPlayerScore: function(playerIndex, score) {
    this.players[playerIndex].score.textContent = score;
  },
  setPlayerDelta: function(playerIndex, delta, preliminary) {
    delta = delta || [];
    if (typeof delta == 'number') {
      delta = [ delta ];
    }

    var total = delta.reduce(function(a, b) {
      return a + b;
    }, 0);

    var str = (total > 0 ? '+' : '') + total;

    var element = this.players[playerIndex].delta;
    element.classList.toggle('hide', total == 0);
    element.classList.toggle('negative', total < 0);
    element.classList.toggle('preliminary', !!preliminary);
    element.textContent = str;

    // clone to trigger animation
    var clone = element.cloneNode(true);
    element.parentNode.replaceChild(clone, element);
    this.players[playerIndex].delta = clone;
  },
  setPlayerStatus: function(playerIndex, status) {
    this.players[playerIndex].status.textContent = status;
    this.players[playerIndex].status.classList.toggle('hide', status.length == 0);
  },
  setPlayerPicture: function(playerIndex, url) {
    var picture = this.players[playerIndex].picture;
    url = url || '?';

    if (url && url.length > 1) {
      var str = url ? 'url("' + url + '")' : null;
      picture.style.backgroundColor = 'transparent';
      picture.style.backgroundImage = str;
      picture.textContent = '';
    } else {
      var letter = url;
      picture.style.backgroundColor = '';
      picture.style.backgroundImage = '';
      picture.textContent = letter;
    }
  },
  showPassDialog: function() {
    this.canvas.classList.add('blur');
    this.passOverlay.classList.remove('hide');
  },
  hidePassDialog: function() {
    this.canvas.classList.remove('blur');
    this.passOverlay.classList.add('hide');
    this.focus();
  },
  isPassDialogVisible: function() {
    return !this.passOverlay.classList.contains('hide');
  },
  clearPassDialog: function() {
    this.passDialogTiles.innerHTML = '';
  },
  addPassDialogTile: function(letter, value, position) {
    var tile = this.createTile(letter, value);
    tile.setAttribute('data-position', position);

    tile.addEventListener('click', function(event) {
      var selected = !this.hasAttribute('data-selected');
      if (selected) {
        this.setAttribute('data-selected', '');
      } else {
        this.removeAttribute('data-selected');
      }
      this.classList.toggle('selected', selected);
    });

    this.passDialogTiles.appendChild(tile);
  },
  getPassDialogIndices: function() {
    var tiles = Array.prototype.slice.call(this.passDialogTiles.children);
    var tileIndices = [];
    tiles.forEach(function(tile, index) {
      if (tile.hasAttribute('data-selected')) {
        tileIndices.push(index);
      }
    });
    return tileIndices;
  },
  selectPassDialogLetter: function(letter) {
    var tiles = Array.prototype.slice.call(this.passDialogTiles.children);
    var letters = tiles.map(function(tile) {
      return !tile.hasAttribute('data-selected') ? tile.getAttribute('data-letter') : undefined;
    });

    var tileIndex = letters.indexOf(letter);
    if (tileIndex >= 0) {
      tiles[tileIndex].setAttribute('data-selected', '');
      tiles[tileIndex].classList.add('selected');
    }
  },
  passDialogEnd: function() {
    sound.play('button');
    this.hidePassDialog();
    game.requestPass(this.getPassDialogIndices());
  },
  passDialogCancel: function() {
    sound.play('button');
    this.hidePassDialog();
  }
};

game.state = {
  board: [],
  values: {},
  locked: false,
  running: false,
  remaining: 0,
  wordMultipliers: [
    3, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 3,
    1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1,
    1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1,
    1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1,
    1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1,
    1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1,
    3, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 3
  ],
  letterMultipliers: [
    1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 3, 1, 1, 1, 3, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1,
    3, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 3,
    1, 3, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 3, 1,
    1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1,
    1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1,
    1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1,
    1, 3, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 3, 1,
    3, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 3,
    1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 3, 1, 1, 1, 3, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1
  ]
};

function Cursor() {
  this.state = {
    x: 7,
    y: 7,
    vertical: false,
    visible: true
  };

  this.element = document.createElement('div');
  this.element.className = 'cursor';

  var angle = document.createElement('div');
  angle.className = 'cursor-angle';
  this.element.appendChild(angle);

  document.getElementById('squares-container').appendChild(this.element);

  this.update();
}

Cursor.prototype.BOARD_WIDTH = 15;
Cursor.prototype.BOARD_HEIGHT = 15;

Object.defineProperty(Cursor.prototype, 'x', {
  get: function() {
    return this.state.x;
  },
  set: function(value) {
    this.state.x = value;
    this.update();
  }
});

Object.defineProperty(Cursor.prototype, 'y', {
  get: function() {
    return this.state.y;
  },
  set: function(value) {
    this.state.y = value;
    this.update();
  }
});

Object.defineProperty(Cursor.prototype, 'index', {
  get: function() {
    return this.state.y * this.BOARD_WIDTH + this.state.x;
  },
  set: function(value) {
    this.state.x = value % this.BOARD_WIDTH;
    this.state.y = Math.floor(value / this.BOARD_WIDTH);
    this.update();
  }
});

Object.defineProperty(Cursor.prototype, 'vertical', {
  get: function() {
    return this.state.vertical;
  },
  set: function(value) {
    this.state.vertical = value;
    this.update();
  }
});

Cursor.prototype.update = function() {
  /*
    // Transition doesn't work correctly with Chrome 44.0.2403.155. Workaround below. This is the original code:
    var transform = 'translateX(' + (this.state.x * 2) + 'em) translateY(' + (this.state.y * 2) + 'em)';

    this.element.style.transform = transform;
    this.element.style.WebkitTransform = transform;
    this.element.style.MsTransform = transform;
  */

  this.element.style.left = this.state.x * 2 + 'em';
  this.element.style.top = this.state.y * 2 + 'em';

  this.element.classList.toggle('vertical', this.state.vertical);
  this.element.classList.toggle('hide', !this.state.visible);

  // TODO remove dependancy from game
  this.element.classList.toggle('subtle', !game.view.isEmpty(this.index));
};

Cursor.prototype.up = function() {
  if (this.state.y - 1 < 0) return;
  this.state.y -= 1;
  this.update();
};

Cursor.prototype.right = function() {
  if (this.state.x + 1 >= this.BOARD_WIDTH) return;
  this.state.x += 1;
  this.update();
};

Cursor.prototype.down = function() {
  if (this.state.y + 1 >= this.BOARD_HEIGHT) return;
  this.state.y += 1;
  this.update();
};

Cursor.prototype.left = function() {
  if (this.state.x - 1 < 0) return;
  this.state.x -= 1;
  this.update();
};

Cursor.prototype.rotate = function() {
  this.state.vertical = !this.state.vertical;
  this.update();
};

Cursor.prototype.next = function() {
  if (this.state.vertical) {
    this.down();
  } else {
    this.right();
  }
};

Cursor.prototype.prev = function() {
  if (this.state.vertical) {
    this.up();
  } else {
    this.left();
  }
};

Cursor.prototype.show = function() {
  this.state.visible = true;
  this.update();
};

Cursor.prototype.hide = function() {
  this.state.visible = false;
  this.update();
};
