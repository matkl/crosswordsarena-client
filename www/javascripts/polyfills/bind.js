if (!Function.prototype.bind) {
  Function.prototype.bind = function(self) {
    if (typeof this != 'function') {
      // closest thing possible to the ECMAScript 5 internal IsCallable function
      throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
    }
    var args = Array.prototype.slice.call(arguments, 1);
    var fn = this;
    var Noop = function () {};
    var bound = function () {
      return fn.apply(this instanceof noop && self ? this : self, args.concat(Array.prototype.slice.call(arguments)));
    };
    noop.prototype = this.prototype;
    bound.prototype = new Noop();
    return bound;
  };
}
