var leaderboard = {
  init: function() {
    this.view.init();
  },
  show: function() {
    this.update();
    this.view.show();
  },
  hide: function() {
    this.view.hide();
  },
  update: function() {
    var self = this;

    var host = app.getHost();
    var group = this.state.group;
    var table = this.state.table;
    //var userId = app.getClientId();
    var userName = app.getUserName();

    var urls = {
      games: {
        allTime: host + '/api/games?sort=score&order=-1&limit=100',
        month: host +'/api/games?timeframe=month&sort=score&order=-1&limit=100',
        personal: host +'/api/games?userName=' + encodeURIComponent(userName) + '&sort=score&order=-1&limit=100'
      },
      plays: {
        allTime: host + '/api/plays?sort=value&order=-1&limit=100',
        month: host + '/api/plays?timeframe=month&sort=value&order=-1&limit=100',
        personal: host + '/api/plays?userName=' + encodeURIComponent(userName) + '&sort=value&order=-1&limit=100'
      },
      words: {
        allTime: host + '/api/words?sort=value&order=-1&limit=100',
        month: host + '/api/words?timeframe=month&sort=value&order=-1&limit=100',
        personal: host + '/api/words?userName=' + encodeURIComponent(userName) + '&sort=value&order=-1&limit=100'
      }
    };

    var url = urls[group][table];

    this.view.selectButton(group, table);
    this.view.hideAllTables();
    this.state.showingUrl = url;

    utils.getJSON(url, function(err, data) {
      if (url != self.state.showingUrl) return;
      self.view.hideAllTables();
      self.view.removeAllTableRows(group, table);

      data.forEach(function(row, index) {
        if (group == 'games') {
          self.view.insertTableRow(group, table, [ index+1+'.', row.name, row.score ], [ null, row.name, null ]);
        } else if (group =='plays') {
          self.view.insertTableRow(group, table, [ index+1+'.', row.name, row.words.join(' '), row.value ], [ null, row.name, row.words.join(' '), null ]);
        } else if (group == 'words') {
          self.view.insertTableRow(group, table, [ index+1+'.', row.name, row.text, row.value ], [ null, row.name, row.text, null ]);
        }
      });

      self.view.showTable(group, table);
    });
  },
  selectGroup: function(group) {
    this.state.group = group;
    this.update();
  },
  selectTable: function(table) {
    this.state.table = table;
    this.update();
  }
};

leaderboard.view = {
  init: function() {
    this.element = document.getElementById('leaderboard');
    this.closeButton = document.getElementById('leaderboard-close');
    this.loading = document.getElementById('leaderboard-loading');
    this.groupButtons = {
      games: document.getElementById('leaderboard-show-games'),
      plays: document.getElementById('leaderboard-show-plays'),
      words: document.getElementById('leaderboard-show-words')
    };
    this.tableButtons = {
      month: document.getElementById('leaderboard-show-month'),
      allTime: document.getElementById('leaderboard-show-all-time'),
      personal: document.getElementById('leaderboard-show-personal')
    };
    this.tables = {
      games: {
        allTime: document.getElementById('leaderboard-games-all-time'),
        month: document.getElementById('leaderboard-games-month'),
        personal: document.getElementById('leaderboard-games-personal')
      },
      words: {
        allTime: document.getElementById('leaderboard-words-all-time'),
        month: document.getElementById('leaderboard-words-month'),
        personal: document.getElementById('leaderboard-words-personal')
      },
      plays: {
        allTime: document.getElementById('leaderboard-plays-all-time'),
        month: document.getElementById('leaderboard-plays-month'),
        personal: document.getElementById('leaderboard-plays-personal')
      }
    }
    this.addEventListeners();
  },
  addEventListeners: function() {
    var self = this;

    this.closeButton.addEventListener('click', function() {
      app.hideOverlay();
    });

    Object.keys(this.groupButtons).forEach(function(group) {
      self.groupButtons[group].addEventListener('click', function() {
        leaderboard.selectGroup(group);
      });
    });

    Object.keys(this.tableButtons).forEach(function(table) {
      self.tableButtons[table].addEventListener('click', function() {
        leaderboard.selectTable(table);
      });
    });
  },
  show: function() {
    this.element.classList.remove('hide');
  },
  hide: function() {
    this.element.classList.add('hide');
  },
  insertTableRow: function(tableGroup, tableName, values, titles) {
    var table = this.tables[tableGroup][tableName];
    var row = table.tBodies[0].insertRow();
    titles = titles || [];

    values.forEach(function(value, index) {
      var cell = row.insertCell();
      cell.textContent = value;
      if (titles[index]) cell.setAttribute('title', titles[index]);
    });
  },
  removeAllTableRows: function(tableGroup, tableName) {
    var table = this.tables[tableGroup][tableName];
    table.tBodies[0].innerHTML = '';
  },
  hideAllTables: function() {
    this.loading.classList.remove('hide');

    for (var i in this.tables) {
      for (var j in this.tables[i]) {
        this.tables[i][j].classList.add('hide');
      }
    }
  },
  showTable: function(tableGroup, tableName) {
    this.loading.classList.add('hide');

    this.tables[tableGroup][tableName].classList.remove('hide');
  },
  selectButton: function(tableGroup, tableName) {
    for (var i in this.groupButtons) {
      this.groupButtons[i].classList.toggle('selected', i == tableGroup);
    }

    for (var i in this.tableButtons) {
      this.tableButtons[i].classList.toggle('selected', i == tableName);
    }
  }
};

leaderboard.state = {
  group: 'games',
  table: 'month',
  showingUrl: null
};
