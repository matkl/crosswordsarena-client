var storage = {
  getItem: function(key) {
    if (!window.localStorage) return;
    try {
      return JSON.parse(window.localStorage.getItem(key));
    } catch (e) {
      return;
    }
  },
  setItem: function(key, value) {
    if (!window.localStorage) return;
    return window.localStorage.setItem(key, JSON.stringify(value));
  }
};
