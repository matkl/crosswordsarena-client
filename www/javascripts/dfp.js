var googletag = googletag || {};
googletag.cmd = googletag.cmd || [];

var adslots = adslots || [];

(function() {
  // don't show DFP ads in Windows app
  if (typeof Windows != 'undefined') {
    window.addEventListener('DOMContentLoaded', function() {
      document.getElementById('ad').classList.add('hide');
    });
    return;
  }

  var gads = document.createElement('script');
  gads.async = true;
  gads.type = 'text/javascript';
  var useSSL = 'https:' == document.location.protocol;
  gads.src = (useSSL ? 'https:' : 'http:') + '//www.googletagservices.com/tag/js/gpt.js';
  var node = document.getElementsByTagName('script')[0];
  node.parentNode.insertBefore(gads, node);

  googletag.cmd.push(function() {
    var mapping = googletag.sizeMapping().
      addSize([0, 0], []).
      addSize([1200, 640], [160, 600]).
      build();

    adslots.push(googletag.defineSlot('/66950634/ad', [160, 600], 'div-gpt-ad-1444955950514-0').
      defineSizeMapping(mapping).
      //setCollapseEmptyDiv(true).
      addService(googletag.pubads())
    );

    //googletag.defineSlot('/66950634/test', [728, 90], 'div-gpt-ad-1444955950514-1').addService(googletag.pubads());
    //googletag.pubads().enableSingleRequest();
    //googletag.pubads().collapseEmptyDivs(true);
    //googletag.pubads().disableInitialLoad();
    googletag.enableServices();
  });

  var refreshTimeoutId = null;
  var lastRefresh = - 1;

  function refresh(showAd) {
    if ((showAd || isAdFrameVisible()) && new Date().getTime() > lastRefresh + 60000) {
      console.log('Refreshing adslots');
      if (showAd) showAdFrame();
      googletag.cmd.push(function() {
        googletag.pubads().refresh(adslots);
      });
      lastRefresh = new Date().getTime();
    }
    refreshTimeoutId = null;
  }

  function triggerRefreshTimeout() {
    clearRefreshTimeout();
    refreshTimeoutId = window.setTimeout(refresh, 2500);
  }

  function clearRefreshTimeout() {
    if (refreshTimeoutId != null) {
      window.clearTimeout(refreshTimeoutId);
    }
    refreshTimeoutId = null;
  }

  function showAdFrame() {
    document.getElementById('ad').classList.remove('hide');
  }

  function hideAdFrame() {
    googletag.cmd.push(function() {
      googletag.pubads().clear(adslots);
    });
    document.getElementById('ad').classList.add('hide');
  }

  function isAdFrameVisible() {
    return !document.getElementById('ad').classList.contains('hide');
  }

  window.addEventListener('DOMContentLoaded', function() {
    var ad = document.getElementById('ad');
    if (!ad) return;

    window.addEventListener('resize', function(event) {
      showAdFrame();
      triggerRefreshTimeout();
    });

    var adHide = document.getElementById('ad-hide');

    if (adHide) {
      adHide.addEventListener('click', function(event) {
        hideAdFrame();
        event.preventDefault();
      });
    }

    function nextAd() {
      clearRefreshTimeout();
      refresh();
    }

    //document.getElementById('start-game').addEventListener('click', nextAd);
    //document.getElementById('leave-game').addEventListener('click', nextAd);

    //document.getElementById('ad').classList.add('hide');

    /*app.onLogin = function() {
      refresh(true);
    };

    game.onRequestLeaveSuccess = function() {
      refresh(true);
    };*/
  });
})();
