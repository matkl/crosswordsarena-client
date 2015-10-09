window.addEventListener('DOMContentLoaded', function() {
  var links = document.querySelectorAll('a[href]');
  Array.prototype.forEach.call(links, function(link) {
    // ignore phonegap internal app links
    if (link.hasAttribute('data-phonegap')) return;
    
    link.addEventListener('click', function(event) {
      window.open(this.getAttribute('href'), '_system');
    });
  });
});
