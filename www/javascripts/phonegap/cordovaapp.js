var cordovaApp = {
  init: function() {
    // quick and dirty: set the host for our websocket connection
    app.setHost('http://' + document.getElementById('host').innerHTML);

    app.init();

    this.addEventListeners();
  },
  addEventListeners: function() {
    document.addEventListener('backbutton', this.onBackbutton.bind(this));
    document.addEventListener('pause', this.onPause.bind(this));
    document.addEventListener('resume', this.onResume.bind(this));
  },
  onBackbutton: function(event) {
    event.preventDefault();
    var handled = app.back();
  },
  onPause: function(event) {
    socket.end();
  },
  onResume: function(event) {
    socket.open();
  }
};
