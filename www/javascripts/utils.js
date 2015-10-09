var utils = {
  http: function(method, url, data, callback) {
    // Data is optional.
    if (typeof data == 'function') {
      callback = data;
      data = undefined;
    }

    var request = new XMLHttpRequest();
    request.open(method, url, true);

    if (method == 'post') {
      data = JSON.stringify(data);
      request.setRequestHeader('Content-type', 'application/json');
    }
      
    request.onload = function() {
      if (this.status >= 200 && this.status < 400) {
        // Success
        callback(null, this.response);
      } else {
        callback(this.status, this.response);
      }
    };
    request.send(data);
  },
  getJSON: function(url, callback) {
    utils.http('get', url, function(err, response) {
      callback(err, err ? response : JSON.parse(response));
    });
  },
  scrolledToBottom: function(element) {
    return element.scrollTop + element.offsetHeight >= element.scrollHeight;
  },
  scrollToBottom: function(element) {
    element.scrollTop = element.scrollHeight - element.offsetHeight;
  },
  // Fisher-Yates Shuffle
  shuffle: function(array) {
    var counter = array.length, temp, index;
    // While there are elements in the array
    while (counter > 0) {
      // Pick a random index
      index = Math.floor(Math.random() * counter);
      // Decrease counter by 1
      counter--;
      // And swap the last element with it
      temp = array[counter];
      array[counter] = array[index];
      array[index] = temp;
    }
    return array;
  }
};

utils.get = utils.http.bind(utils, 'get');
utils.post = utils.http.bind(utils, 'post');
