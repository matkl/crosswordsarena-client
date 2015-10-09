function translator(translations) {
  return function translate(str) {
    var args = Array.prototype.slice.call(arguments);
    if (translations.hasOwnProperty(str)) args[0] = translations[str];
    return sprintf.apply(null, args);
  }
}