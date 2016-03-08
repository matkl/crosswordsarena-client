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
    this.hideMessage({ force: true });

    this.state.playerIndex = data.playerIndex;
    this.state.opponentIndex = data.opponentIndex;
    this.state.running = data.running;
    this.state.values = data.values || this.state.values;
    this.state.remaining = data.remaining;
    this.state.board = data.board;
    this.state.players = data.players;
    this.state.timeOffset = data.time - new Date().getTime();
    this.state.rules = data.rules;

    // TODO: view should not know about playerIndex
    this.view.setPlayerIndices(this.state.playerIndex, this.state.opponentIndex);

    this.presentBoard();
    this.presentRacks();

    this.view.hidePassDialog();
    this.view.setRemaining(data.remaining);

    var player = this.state.player = this.state.players[this.state.playerIndex];
    var opponent = this.state.opponent = this.state.players[this.state.opponentIndex];

    this.lock();

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

      if (player.turn) {
        this.turn(index, player.turn.startTime, player.turn.endTime);
      }
    }, this);

/*
    this.endTurn();
    if (player.turn) {
      this.startTurn();
    }
*/

    if (this.state.rules) {
      this.view.hideRulesDialog();
    } else {
      this.view.showRulesDialog();
      if (player.rulesSubmitted) {
        this.view.rulesDialog.lock();
        this.view.rulesDialog.setRules(player.rules);
      } else {
        this.view.rulesDialog.setAutoStartTimer(data.autoStartTime - data.time);
      }
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
    opponentChat.removeAllMessages()

    this.view.setPlayerDelta(0, 0);
    this.view.setPlayerDelta(1, 0);
    this.view.clearSubmitted();

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

      if (playerIndex == this.state.opponentIndex) {
        // "hidden" tiles (opponent rack)
        for (var i = 0; i < player.rackLength; i++) {
          this.view.addTile(playerIndex);
        }
      }
      if (playerIndex == this.state.playerIndex) {
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
  turn: function(playerIndex, startTime, endTime, update) {
    var self = this;

    this.state.players.forEach(function(player, index) {
      var hasTurn = playerIndex == index;
      player.turn = hasTurn;

      if (playerIndex == index && endTime) {
        self.view.startHourglass(index, startTime, endTime, startTime);
      } else {
        self.view.hideHourglass(index);
      }

      self.view.setTurn(index, hasTurn);
    });

    if (!update) {
      var myTurn = playerIndex == this.state.playerIndex;
      if (myTurn) {
        this.startTurn();
      } else {
        this.endTurn();
      }
    }
  },
  startTurn: function() {
    this.unlock();
    this.cursor.show();
    this.showMessage(t('Your Turn'));
    sound.play('turn');
  },
  endTurn: function() {
    this.lock();
    this.view.setPlayerDelta(game.state.opponentIndex, 0);
    this.cursor.hide();
    this.hidePassDialog();
    //this.removeAll(0);
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
    var playerIndex = this.state.playerIndex;

    if (this.state.locked) return;
    if (this.state.board[squareIndex]) return;
    if (this.state.players[playerIndex].targets.indexOf(squareIndex) >= 0) return;

    this.put(playerIndex, tileIndex, squareIndex);
    this.presentPlayValue(playerIndex);
    socket.write({ type: 'action', action: 'put', tileIndex: tileIndex, squareIndex: squareIndex });

    return true;
  },
  requestPutLetter: function(letter) {
    var playerIndex = this.state.playerIndex;
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
    var playerIndex = this.state.playerIndex;

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
    var playerIndex = this.state.playerIndex;

    if (this.state.locked) return;
    this.state.players[playerIndex].targets.forEach(function(target, tileIndex) {
      if (target == squareIndex) {
        this.requestRemove(tileIndex);
      }
    }, this);
  },
  requestRemoveAll: function() {
    var playerIndex = this.state.playerIndex;
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
    var playerIndex = this.state.playerIndex;
    if (!this.state.players[playerIndex].turn) return;

    //this.lock();
    this.view.focus();
    socket.write({ type: 'action', action: 'submit' });
  },
  requestCancel: function() {
    var playerIndex = this.state.playerIndex;
    if (!this.state.players[playerIndex].turn) return;

    this.requestRemoveSlowpoke();
    if (!game.requestRemoveAll()) {
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
    //game.lock();
  },
  requestStart: function() {
    socket.write({ type: 'action', action: 'ready' });
    this.view.toggleStartButtonDisabled(true);
  },
  requestConcede: function(callback) {
    var self = this;
    app.confirm(t('Concede'), t('Are you sure you want to concede?'), function() {
      //self.lock();
      socket.write({ type: 'action', action: 'concede' });
      if (callback) callback();
    });
  },
  requestClaimVictory: function() {
    //this.lock();
    socket.write({ type: 'action', action: 'claimVictory' });
  },
  requestLeave: function(callback, alwaysConfirm) {
    if (!alwaysConfirm && !this.state.running) {
      leave();
      if (typeof callback == 'function') callback();
      return;
    }

    app.confirm(t('Leave Game'), t('Are you sure you want to leave this game?'), function() {
      socket.write({ type: 'action', action: 'leave' });
      if (typeof callback == 'function') callback();
    });      

    function leave() {
      socket.write({ type: 'action', action: 'leave' });
      if (typeof callback == 'function') callback();
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

    if (playerIndex == this.state.opponentIndex) {
      this.view.hideTile(playerIndex, tileIndex);
    }

    this.view.fanTiles(playerIndex);
    sound.play('tock');
  },
  removeAll: function(playerIndex) {
    console.log('removing', this.state.players[playerIndex].targets);

    this.view.removeAll(playerIndex);
    if (playerIndex == this.state.opponentIndex) {
      this.view.hideTiles(playerIndex);
    }

/*    this.state.players[playerIndex].targets.forEach(function(squareIndex, tileIndex) {
      this.view.remove(playerIndex, tileIndex);
      console.log('letter', this.state.players[playerIndex].rack[tileIndex]);

      if (playerIndex == 1) {
        this.view.hideTile(playerIndex, tileIndex);
      }
    }, this);
*/
    this.state.players[playerIndex].targets = [];
    this.view.fanTiles(playerIndex);
  },
  submit: function(data) {
    //var playerIndex = this.state.players[0].turn ? 0 : 1;
    var playerIndex = data.playerIndex;
    var player = this.state.players[playerIndex];

    if (data.error) {
      //this.unlock();
      if (data.error.message) {
        this.showMessage(data.error.message);
      }
      return;
    }

    //player.targets = data.play;

    this.view.clearSubmitted();

    this.view.setPlayerDelta(playerIndex, data.scores);
    this.view.setPlayerDelta(playerIndex == 0 ? 1 : 0, 0);

    var highestTarget = -1;
    var tileIndices = [];

    data.play.forEach(function(squareIndex, tileIndex) {
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
    data.play.forEach(function(target) {
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

    this.view.moveTilesToBoard(playerIndex, data.play);
    this.view.factorInSquares(squares);
    this.cursor.index = highestTarget;
    this.cursor.vertical = data.direction == 1;
    this.cursor.next();

    if (this.state.players[this.state.playerIndex].turn) {
      sound.play('success1');
      this.addScore(this.state.playerIndex, data.scores);
      this.lock();
      //this.endTurn();
    } else {
      this.addScore(this.state.opponentIndex, data.scores);

      this.state.remaining -= data.draw;
      this.view.setRemaining(this.state.remaining);
      for (var i = 0; i < data.draw; i++) {
        this.view.addTile(playerIndex);
      }
      this.view.fanTiles(playerIndex);
    }

    if (data.rackLength != null) player.rackLength = data.rackLength;
  },
  pass: function(playerIndex, tileIndices, draw) {
    this.removeAll(playerIndex);

    this.view.removeTiles(playerIndex, tileIndices);

    // quick hack
    // TODO: a better way would be to remove tiles for both player and
    // opponent and add the new tiles afterwards.
    if (playerIndex != this.state.playerIndex) {
      for (var i = 0; i < draw; i++) {
        this.view.addTile(playerIndex, '');
      }
      this.view.fanTiles(playerIndex);
    }
  },
  exchange: function(tiles, rack) {
    var playerIndex = this.state.playerIndex;

    this.removeAll(playerIndex);

    tiles.forEach(function(tile) {
      this.view.addTile(playerIndex, tile, this.state.values[tile]);
    }, this);
    this.state.players[playerIndex].rack = rack;
    this.state.remaining -= tiles.length;
    this.view.setRemaining(this.state.remaining);
    this.view.fanTiles(playerIndex);
  },
  concede: function(playerIndex, playerName) {
    // TODO
  },
  finish: function(data) {
    this.lock();
    switch (data.outcome) {
      case 1:
        // we win
        this.showMessage(t('You win'));
        sound.play('roll3');
        app.increaseGamesWonCounter();
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

    this.state.players.forEach(function(player, index) {
      this.removeAll(index);
    }, this);

    data.penalties.forEach(function(penalty, playerIndex) {
      this.addScore(playerIndex, -penalty);
    }, this);
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

    if (playerIndex == this.state.opponentIndex) {
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
  },
  getOpponentClientId: function() {
    if (this.state.opponent) {
      return this.state.opponent.id;
    } else {
      return null;
    }
  },
  getTime: function() {
    return new Date().getTime() + this.state.timeOffset;
  },
  selectPass: function(tileIndices) {
    socket.write({ type: 'action', action: 'selectPass', tileIndices: tileIndices });
  },
  showMessage: function(text) {
    this.view.showMessage(text);
  },
  hideMessage: function(options) {
    options = options || {};
    if (!options.force && !this.hasTurn()) return;
    this.view.hideMessage();
  },
  hasTurn: function() {
    if (!this.state.players) return false;
    if (this.state.players.length == 0) return false;
    return !!this.state.players[this.state.playerIndex].turn;
  },
  updateRules: function(rules, startTime) {
    this.view.rulesDialog.setAgreedRules(rules);
    this.view.rulesDialog.setStartTimer(startTime - this.getTime());
  },
  setSlowpoke: function(playerIndex, value) {
    this.state.players[playerIndex].slowpoke = value;
  },
  requestRemoveSlowpoke: function() {
    var playerIndex = this.state.playerIndex;
    var player = this.state.players[playerIndex];
    if (player.slowpoke) {
      this.ping();
      delete player.slowpoke;
    }
  },
  ping: function() {
    socket.write({ type: 'action', action: 'ping' });
  }
};

game.view = {
  fontSize: 0,
  init: function() {
    this.element = document.getElementById('game');
    this.table = document.getElementById('table');
    this.canvas = document.getElementById('canvas');
    this.tableContent = document.getElementById('table-content');
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
    this.appBarLeaveButton = document.getElementById('app-bar-leave-game');
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
    this.rulesOverlay = document.getElementById('rules-overlay');
    this.rulesDialog = new RulesDialog();

    this.players = [];
    this.player = {
      rack: document.getElementById('rack'),
      rackContainer: document.getElementById('rack-container'),
      unitFrame: document.getElementById('player'),
      name: document.getElementById('player-name'),
      score: document.getElementById('player-score'),
      delta: document.getElementById('player-delta'),
      status: document.getElementById('player-status'),
      picture: document.getElementById('player-picture'),
      hourglass: new Hourglass(document.getElementById('hourglass'), { sound: true })
    };
    this.opponent = {
      rack: document.getElementById('opponent-rack'),
      rackContainer: document.getElementById('opponent-rack-container'),
      unitFrame: document.getElementById('opponent'),
      name: document.getElementById('opponent-name'),
      score: document.getElementById('opponent-score'),
      delta: document.getElementById('opponent-delta'),
      status: document.getElementById('opponent-status'),
      picture: document.getElementById('opponent-picture'),
      hourglass: new Hourglass(document.getElementById('opponent-hourglass'))
    };

    this.rack = this.player.rack;

    this.addEventListeners();
  },
  setPlayerIndices: function(playerIndex, opponentIndex) {
    this.players[playerIndex] = this.player;
    this.players[opponentIndex] = this.opponent;
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

      opponentChat.removeAllMessages();
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
      game.requestLeave(game.onRequestLeaveSuccess, true);
    });

    this.appBarLeaveButton.addEventListener('click', function() {
      ga('send', 'event', 'button', 'click', 'leave');

      sound.play('button');
      game.requestLeave(game.onRequestLeaveSuccess);
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
      return 'translate3d(' + x + 'px,' + y + 'px, 0)';
    }

    function start(tile, clientX, clientY) {
      game.requestRemoveSlowpoke();
      tile.classList.add('dragging');
      tile.setAttribute('data-dragging', true);
      tile.style.fontSize = '';

      app.vibrate(20);

      moveDistance = 0;
      lastClientX = clientX;
      lastClientY = clientY;

      var tileRect = tile.getBoundingClientRect();
      var rackRect = rack.getBoundingClientRect();
      offsetX = rackRect.left + tileRect.width / 2;
      offsetY = rackRect.top + tileRect.height / 2;

      // update position
      move(tile, clientX, clientY);
    }

    function move(tile, clientX, clientY) {
      var dx = clientX - lastClientX;
      var dy = clientY - lastClientY;
      moveDistance += Math.sqrt(dx*dx + dy*dy);
      lastClientX = clientX;
      lastClientY = clientY;

      tile.style.fontSize = '';
      var transform = translate(clientX - offsetX, clientY - offsetY);
      tile.style.transform = transform;
      tile.style.WebkitTransform = transform;
      tile.style.MsTransform = transform;

      var squaresRect = squares.getBoundingClientRect();
      var x = Math.floor((lastClientX - squaresRect.left) / squaresRect.width * 15);
      var y = Math.floor((lastClientY - squaresRect.top) / squaresRect.height * 15);


      if (x >= 0 && x < 15 && y >= 0 && y < 15) {
        // over board
        opponentChat.fadeOut();
      } else {
        // not over board

        //var pos = Math.max(0, Math.min(6, parseInt((clientX - offsetX + 20) / 40)));
        // TODO: test this
        var pos = Math.max(0, Math.min(6, parseInt((clientX - offsetX + 22) / 44)));
        self.fanTiles(game.state.playerIndex, pos);
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
        opponentChat.fadeOut();
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
      game.requestRemoveSlowpoke();
      opponentChat.fadeOut();

      var index = getIndex(tile);
      if (index == -1) return;

      if (game.state.player.targets[index] != undefined) {
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
      game.requestRemoveSlowpoke();
      var rect = squares.getBoundingClientRect();
      var clickedBoard = rectHasPoint(rect, clientX, clientY);

      if (!game.state.player.turn || !clickedBoard) {
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

    // TODO: DRY. mousedown/touchstart
    this.canvas.addEventListener('mousedown', function(event) {
      if (event.button != 0) return;

      game.hideMessage();

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
        opponentChat.fadeOut();
        clickBoard(clientX, clientY);
      }
    });

    // TODO: DRY. mousedown/touchstart
    this.canvas.addEventListener('touchstart', function(event) {
      event.preventDefault();

      game.hideMessage();

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
        opponentChat.fadeOut();
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
      game.shuffleTiles(game.state.playerIndex);
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

      game.hideMessage();

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
    this.appBarLeaveButton.classList.remove('hide');
  },
  hide: function() {
    this.element.classList.add('hide');
    this.appBarLeaveButton.classList.add('hide');

    this.players.forEach(function(player) {
      player.hourglass.hide();
    });
  },
  focus: function() {
    this.element.focus();
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

        var square = this.squares.children[squareIndex];
        square.appendChild(tile);
        square.classList.add('is-submitted');
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
      square.classList.remove('is-factored-in');
    });

    var self = this;
    window.requestAnimationFrame(function() {
      Array.prototype.forEach.call(self.squares.children, function(square, squareIndex) {
        var isFactoredIn = squareIndices.indexOf(squareIndex) >= 0;
        if (isFactoredIn) {
          square.classList.add('is-factored-in');
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
    /*var RACK_FONT_SIZE = 22;
    var scale = RACK_FONT_SIZE / this.fontSize;
    console.log(scale);*/
    var scale = 1;
    var rack = this.players[playerIndex].rack;
    var tiles = Array.prototype.slice.call(rack.children);
    utils.shuffle(tiles);
    tiles.forEach(function(tile, index) {
      tile.setAttribute('data-position', index);
      //tile.style.transform = 'scale(' + scale + ') translateX(' + (index * 2) + 'em)';
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
    var squares = this.squares.children;
    Array.prototype.forEach.call(this.squares.children, function(square) {
      square.classList.remove('is-submitted');
      square.classList.remove('is-factored-in');
    });
  },
  addBoardTile: function(squareIndex, letter, value) {
    var tile = this.createTile(letter, value);
    this.squares.children[squareIndex].appendChild(tile);
  },
  put: function(playerIndex, tileIndex, squareIndex, letter, value) {
    //var RACK_FONT_SIZE = 22;
    //var scale = this.fontSize / RACK_FONT_SIZE;

    var rack = this.players[playerIndex].rack;
    var rackRect = rack.getBoundingClientRect();
    var tile = rack.children[tileIndex];
    if (!tile) return;

    var square = this.squares.children[squareIndex];
    var squareRect = square.getBoundingClientRect();

    tile.setAttribute('data-target', squareIndex);
    var translateX = squareRect.left - rackRect.left;
    var translateY = squareRect.top - rackRect.top;
    var transform = 'translateX(' + translateX + 'px) translateY(' + translateY + 'px)';
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

    if (!tile) return;
    tile.removeAttribute('data-target');
    tile.style.transform = '';
    tile.style.WebkitTransform = '';
    tile.style.MsTransform = '';
    tile.style.fontSize = '';
  },
  removeAll: function(playerIndex) {
    for (var i = 0, l = this.players[playerIndex].rack.children.length; i < l; i++) {
      this.remove(playerIndex, i);
    }
  },
  hideTile: function(playerIndex, tileIndex) {
    var tile = this.players[playerIndex].rack.children[tileIndex];
    tile.querySelector('.tile-text').textContent = '';
    tile.querySelector('.tile-value').textContent = '';
  },
  hideTiles: function(playerIndex) {
    for (var i = 0, l = this.players[playerIndex].rack.children.length; i < l; i++) {
      this.hideTile(playerIndex, i);
    }
  },
  /*toggleTurn: function(turn, data) {
    this.player.unitFrame.classList.toggle('active', turn);
    this.opponent.unitFrame.classList.toggle('active', !turn);
  },*/
  setTurn: function(playerIndex, value) {
    this.players[playerIndex].unitFrame.classList.toggle('active', !!value);
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
    var self = this;

    this.remaining.classList.add('hide');

    this.players.forEach(function(player, index) {
      player.hourglass.hide();
      self.setTurn(index, false);
    });

    this.submitButton.classList.add('hide');
    this.cancelButton.classList.add('hide');
    this.startButton.classList.remove('hide');
    this.leaveButton.classList.remove('hide');

    this.hideRulesDialog();
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
    var rack = this.player.rack;
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
    game.hideMessage({ force: true });

    // disable animations for a moment so the tiles are not flying around
    self.element.classList.add('notransition');

    // hide the board so we can calculate our space
    self.board.classList.add('hide');

    // reset offsets
    // we will set these later to full pixels for better quality
    self.board.style.left = '';
    self.board.style.top = '';
    self.players.forEach(function(player) {
      player.rackContainer.style.left = '';
      player.rackContainer.style.top = '';
    });

    window.requestAnimationFrame(function() {
      var rect = self.boardContainer.getBoundingClientRect();
      var width = rect.width - minBorderWidth;
      var height = rect.height - minBorderWidth;
      var devicePixelRatio = window.devicePixelRatio || 1;

      self.board.classList.remove('hide');

      var fontSize = Math.min(22, Math.min(width/30, height/31.75));
      fontSize = Math.floor(fontSize * 2) / 2;

      self.board.style.fontSize = fontSize + 'px';
      /*self.rack.style.fontSize = fontSize + 'px';*/
      self.board.style.padding = (Math.floor(fontSize / 2) + 1) + 'px';

      // bigger padding for larger screen sizes
      //var padding = fontSize < 20 ? Math.floor(0.75 * fontSize) : fontSize;
      //self.board.style.padding = padding + 'px ' + (padding + 1) + 'px ' + (padding + 1) + 'px ' + padding + 'px';
      
      self.fontSize = fontSize;

      // snap board to full pixels
      var boardRect = self.board.getBoundingClientRect();
      var offsetLeft = boardRect.left % 1;
      var offsetTop = boardRect.top % 1;
      self.board.style.position = 'relative';
      self.board.style.left = -offsetLeft + 'px';
      self.board.style.top = -offsetTop + 'px';

      var dpOffset = 0;
      if (devicePixelRatio > 1) {
        dpOffset = -0.5;
      }

      // snap racks to full pixels
      self.players.forEach(function(player) {
        var rackContainer = player.rackContainer;
        var rackRect = rackContainer.getBoundingClientRect();
        var offsetLeft = rackRect.left % 1;
        var offsetTop = rackRect.top % 1;
        rackContainer.style.position = 'relative';
        rackContainer.style.left = -offsetLeft + 'px';
        rackContainer.style.top = -offsetTop + 'px';
      });

      // rearrange player tiles on board
      self.players.forEach(function(player) {
        var rackRect = player.rackContainer.getBoundingClientRect();

        Array.prototype.forEach.call(player.rack.children, function(tile) {
          if (tile.hasAttribute('data-target')) {
            var squareIndex = tile.getAttribute('data-target');
            var squareRect = self.squares.children[squareIndex].getBoundingClientRect();
            var translateX = squareRect.left - rackRect.left;
            var translateY = squareRect.top - rackRect.top;
            var transform = 'translateX(' + translateX + 'px) translateY(' + translateY + 'px)';
            
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
    this.tableContent.classList.add('blur');
    this.passOverlay.classList.remove('hide');
  },
  hidePassDialog: function() {
    this.tableContent.classList.remove('blur');
    this.passOverlay.classList.add('hide');
    if (!chat.hasFocus()) {
      this.focus();
    }
  },
  showRulesDialog: function() {
    this.tableContent.classList.add('blur');
    this.rulesOverlay.classList.remove('hide');
  },
  hideRulesDialog: function() {
    this.tableContent.classList.remove('blur');
    this.rulesOverlay.classList.add('hide');
    this.rulesDialog.reset();
    this.rulesDialog.stop();
    if (!chat.hasFocus()) {
      this.focus();
    }
  },
  isPassDialogVisible: function() {
    return !this.passOverlay.classList.contains('hide');
  },
  clearPassDialog: function() {
    this.passDialogTiles.innerHTML = '';
  },
  addPassDialogTile: function(letter, value, position) {
    var self = this;
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
      game.selectPass(self.getPassDialogIndices());
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

    game.selectPass(this.getPassDialogIndices());
  },
  passDialogEnd: function() {
    sound.play('button');
    this.hidePassDialog();
    game.requestPass(this.getPassDialogIndices());
  },
  passDialogCancel: function() {
    sound.play('button');
    game.selectPass([]);
    this.hidePassDialog();
  },
  startHourglass: function(playerIndex, startTime, endTime) {
    this.players[playerIndex].hourglass.start(startTime, endTime);
  },
  hideHourglass: function(playerIndex) {
    this.players[playerIndex].hourglass.hide();
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

  this.element = document.getElementById('cursor');
  this.angle = document.getElementById('cursor-angle');
  /*this.element = document.createElement('div');
  this.element.className = 'cursor';

  var angle = document.createElement('div');
  angle.className = 'cursor-angle';
  this.element.appendChild(angle);

  document.getElementById('squares-container').appendChild(this.element);
  */
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
  //var transform = 'translateX(' + (this.state.x * 2) + 'em) translateX(' + (this.state.x + 1) + 'px) translateY(' + (this.state.y * 2) + 'em) translateY(' + (this.state.y + 1) + 'px)';
  var transform = 'translate3d(' + (this.state.x * 2) + 'em, ' + (this.state.y * 2) + 'em, 0)';
  this.element.style.transform = transform;
  this.element.style.WebkitTransform = transform;
  this.element.style.MsTransform = transform;
  
  // Transition doesn't work correctly with Chrome 44.0.2403.155. Workaround below:
  //this.element.style.left = 'calc(' + (this.state.x * 2) + 'em + ' + (this.state.x + 1) + 'px)';
  //this.element.style.top = 'calc(' + (this.state.y * 2) + 'em + ' + (this.state.y + 1) + 'px)';

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


function Hourglass(element, options) {
  this.element = element;
  this.path = this.element.querySelector('.hourglass-path');
  this.options = options || {};
}

Hourglass.prototype.start = function(startTime, endTime) {
  this.startTime = startTime;
  this.endTime = endTime;
  this.hot = false;
  this.element.classList.remove('hide');
  this.animate();
  this.update();
};

Hourglass.prototype.stop = function() {
  /*if (this.animationFrame) {
    window.cancelAnimationFrame(this.animationFrame);
  }*/

  this.hot = false;

  if (this.interval) {
    window.clearInterval(this.interval);
  }

  if (this.options.sound) {
    if (this.sound) this.sound.stop();
    delete this.sound;
  }
};

Hourglass.prototype.animate = function() {
  var self = this;

  if (this.interval) {
    window.clearInterval(this.interval);
  }

  this.interval = window.setInterval(function() {
    self.update();
  }, 1000);
/*
  if (this.animationFrame) {
    window.cancelAnimationFrame(this.animationFrame);
  }

  function anim() {
    self.update();
    self.animationFrame = window.requestAnimationFrame(anim);
  }

  self.animationFrame = window.requestAnimationFrame(anim);
*/
};

Hourglass.prototype.update = function() {
  var now = game.getTime();

  var fraction = (now - this.startTime) / (this.endTime - this.startTime);
  var remaining = this.endTime - now;

  if (fraction < 0) {
    fraction = 0;
  } else if (fraction > 1) {
    fraction = 1;
  }

  //this.path.style.strokeDashoffset = 100 - (fraction * 100) + 'px';
  this.path.style.width = fraction * 100 + '%';
  //this.path.style.transform = 'translateX(' + (-100 + fraction * 100) + '%)';

  this.element.classList.toggle('hourglass-highlight', remaining < 30000);

  if (remaining < 30000) {
    if (!this.hot) {
      if (this.options.sound) {
        if (this.sound) this.sound.stop();
        this.sound = sound.play('clock', { loop: true });
      }
    }
    this.hot = true;
  } else {
    if (this.sound) this.sound.stop();
  }
};

Hourglass.prototype.hide = function() {
  this.stop();
  this.element.classList.add('hide');
};

function RulesDialog() {
  var self = this;

  this.rules = {};
  this.locked = false;
  this.agreed = false;

  this.element = document.getElementById('rules-dialog');
  this.options = document.getElementById('rules-options');
  this.standardButton = document.getElementById('rules-standard');
  this.startButton = document.getElementById('rules-start');

  this.options.addEventListener('click', function(event) {
    if (self.locked) return;

    var rule = event.target.getAttribute('data-rule');
    if (!rule) return;

    if (rule == 'standard') {
      self.reset();
      self.send();
      return;
    }

    self.toggleRule(rule);
  });

  this.startButton.addEventListener('click', function(event) {
    self.lock();
    self.send(true);
  });

  this.update();
}

RulesDialog.prototype.reset = function() {
  this.rules = {};
  this.agreed = false;
  this.locked = false;
  this.update();
};

RulesDialog.prototype.toggleRule = function(rule) {
  //this.rules[rule] = !this.rules[rule];
  this.rules[rule] = true;
  this.update();
  this.send();
};

RulesDialog.prototype.update = function() {
  var self = this;
  var rulesCount = 0;

  Array.prototype.forEach.call(this.options.children, function(button) {
    var rule = button.getAttribute('data-rule');
    if (self.rules[rule]) rulesCount += 1;
    button.classList.toggle('rules-active', self.rules[rule]);
  });

  this.standardButton.classList.toggle('rules-active', rulesCount == 0);

  this.element.classList.toggle('rules-locked', !!this.locked);
  this.element.classList.toggle('rules-agreed', !!this.agreed);
  this.startButton.classList.toggle('hide', !!this.locked);

  document.getElementById('rules-title-select').classList.toggle('hide', !!this.locked);
  document.getElementById('rules-title-wait').classList.toggle('hide', !(!!this.locked && !this.agreed));
  document.getElementById('rules-title-timer-start').classList.toggle('hide', !(!!this.locked && this.agreed));
};

RulesDialog.prototype.lock = function() {
  this.locked = true;
  this.update();
};

RulesDialog.prototype.unlock = function() {
  this.locked = false;
  this.update();
};

RulesDialog.prototype.send = function(submit) {
  socket.write({ type: 'action', action: 'rules', rules: this.rules, submit: submit });
};

RulesDialog.prototype.setRules = function(rules) {
  this.rules = rules || {};
  this.update();
};

RulesDialog.prototype.setAgreedRules = function(rules) {
  this.rules = rules;
  this.locked = true;
  this.agreed = true;

  this.update();
};

// both player selected rules
RulesDialog.prototype.setStartTimer = function(delay) {
  var self = this;

  function updateTime() {
    var seconds = Math.round(delay / 1000);
    document.getElementById('rules-title-timer-start').textContent = t(seconds == 1 ? 'Game will start in %d second' : 'Game will start in %d seconds', seconds);
  }

  function start() {
    self.reset();
    game.view.hideRulesDialog();
  }

  this.startIntervalId = window.setInterval(function() {
    delay -= 1000;
    updateTime();

    if (delay < 0) {
      window.clearInterval(self.startIntervalId);
      delete self.startIntervalId;
      start();
    }
  }, 1000);

  updateTime();
};

// waiting for player to select rules
RulesDialog.prototype.setAutoStartTimer = function(delay) {
  var self = this;

  function updateTime() {
    var seconds = Math.round(delay / 1000);
    document.getElementById('rules-title-timer-autostart').textContent = ' (' + seconds + ')';
  }

  this.autoStartIntervalId = window.setInterval(function() {
    delay -= 1000;
    updateTime();

    if (delay < 0) {
      window.clearInterval(self.autoStartIntervalId);
      delete self.autoStartIntervalId;
    }
  }, 1000);

  updateTime();
};

RulesDialog.prototype.stop = function() {
  if (this.startIntervalId) {
    window.clearInterval(this.startIntervalId);
    delete this.startIntervalId;
  }

  if (this.autoStartIntervalId) {
    window.clearInterval(this.autoStartIntervalId);
    delete this.autoStartIntervalId;
  }
};
