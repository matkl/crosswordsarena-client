var googletag = googletag || {};
googletag.cmd = googletag.cmd || [];

var adslots = adslots || [];

(function() {
  var gads = document.createElement('script');
  gads.async = true;
  gads.type = 'text/javascript';
  var useSSL = 'https:' == document.location.protocol;
  gads.src = (useSSL ? 'https:' : 'http:') + '//www.googletagservices.com/tag/js/gpt.js';
  var node = document.getElementsByTagName('script')[0];
  node.parentNode.insertBefore(gads, node);
})();

googletag.cmd.push(function() {
  var mapping = googletag.sizeMapping().
    addSize([0, 0], []).
    addSize([1200, 600], [160, 600]).
    addSize([1600, 600], [300, 600]).
    build();

  adslots.push(googletag.defineSlot('/66950634/ad', [160, 600], 'div-gpt-ad-1444955950514-0').
    defineSizeMapping(mapping).
    //setCollapseEmptyDiv(true).
    addService(googletag.pubads())
  );

  //googletag.defineSlot('/66950634/test', [728, 90], 'div-gpt-ad-1444955950514-1').addService(googletag.pubads());
  //googletag.pubads().enableSingleRequest();
  googletag.enableServices();
});


window.addEventListener('resize', function(event) {
  console.log('Refreshing adslots');
  googletag.cmd.push(function() {
    googletag.pubads().refresh(adslots);
  });
});
