function animate(element, animation) {
  var eventNames = [
    'animationend',
    'webkitAnimationEnd',
    'MSAnimationEnd',
    'oAnimationEnd'
  ];
  var listeners = [];

  element.classList.add('animated');
  element.classList.add(animation);

  eventNames.forEach(function(eventName) {
    listeners.push(element.addEventListener(eventName, function() {
      listeners.forEach(function(listener) {
        element.removeEventListener(eventName, listener);
      });
      element.classList.remove('animated');
      element.classList.remove(animation);
    }));
  });
}

// window.requestAnimationFrame()
window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.oRequestAnimationFrame;
