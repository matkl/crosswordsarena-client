var appBar = {
  init: function() {
    this.element = document.getElementById('app-bar');
    this.lobby = document.getElementById('app-bar-lobby');
    this.game = document.getElementById('app-bar-game');
  },
  show: function(state) {
    this.element.classList.remove('hide');
    this.element.classList.toggle('app-bar-transparent', state == 'game' || state == 'start');
    this.game.classList.toggle('hide', state != 'game');
    this.lobby.classList.toggle('hide', state != 'lobby');
  },
  hide: function() {
    this.element.classList.add('hide');
    this.element.classList.remove('app-bar-transparent');
  }
};
