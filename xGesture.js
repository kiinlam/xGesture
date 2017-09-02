/**
 * xGesture.js
 * https://github.com/kiinlam/xGesture
 */

;(function(window, $) {

  'use strict';

  var isSupportTouch = 'ontouchend' in document ? true : false,
    _touchstart = isSupportTouch ? 'touchstart' : 'mousedown',
    _touchmove = isSupportTouch ? 'touchmove' : 'mousemove',
    _touchend = isSupportTouch ? 'touchend' : 'mouseup',
    touch = {},
    tapTimeout, swipeTimeout;

  function direction(x1, x2, y1, y2) {
    return Math.abs(x1 - x2) >=
      Math.abs(y1 - y2) ? (x1 - x2 > 0 ? 'Left' : 'Right') : (y1 - y2 > 0 ? 'Up' : 'Down');
  }

  function cancelAll() {
    if (tapTimeout) clearTimeout(tapTimeout);
    if (swipeTimeout) clearTimeout(swipeTimeout);
    tapTimeout = swipeTimeout = null;
    touch = {};
  }

  var gst = function($elem) {
    var gesture = $elem || $(document);
    var now, delta, deltaX = 0,
      deltaY = 0,
      firstTouch;

    gesture
      .on(_touchstart, function(e) {
        firstTouch = !isSupportTouch ? e : e.touches[0];
        if (e.touches && e.touches.length === 1 && touch.x2) {
          // Clear out touch movement data if we have it sticking around
          // This can occur if touchcancel doesn't fire due to preventDefault, etc.
          touch.x2 = undefined;
          touch.y2 = undefined;
        }
        now = Date.now();
        delta = now - (touch.last || now);
        touch.el = $elem || $('tagName' in firstTouch.target ?
          firstTouch.target : firstTouch.target.parentNode);
        touch.x1 = firstTouch.pageX;
        touch.y1 = firstTouch.pageY;
        touch.last = now;
      })
      .on(_touchmove, function(e) {
        var moveX, moveY;
        moveX = moveY = 0;
        if (!touch.x1 && !touch.y1) return;
        firstTouch = !isSupportTouch ? e : e.touches[0];
        touch.x2 = firstTouch.pageX;
        touch.y2 = firstTouch.pageY;

        moveX = Math.abs(touch.x1 - touch.x2);
        moveY = Math.abs(touch.y1 - touch.y2);
        deltaX += moveX;
        deltaY += moveY;

        if (moveX > 3 || moveY > 3) {
          touch.el.trigger('draw', { detail: touch });
        }
        e.preventDefault();
      })
      .on(_touchend, function(e) {

        // draw end
        if ((touch.x2 && Math.abs(touch.x1 - touch.x2) > 3) ||
          (touch.y2 && Math.abs(touch.y1 - touch.y2) > 3))

          touch.el.trigger('drawEnd');

        // swipe
        if ((touch.x2 && Math.abs(touch.x1 - touch.x2) > 30) ||
          (touch.y2 && Math.abs(touch.y1 - touch.y2) > 30))

          swipeTimeout = setTimeout(function() {
          touch.el.trigger('swipe', { detail: touch });
          touch = {};
        }, 0);

        // normal tap
        else if ('last' in touch)
        // don't fire tap when delta position changed by more than 30 pixels,
        // for instance when moving to a point and back to origin
          if (deltaX < 30 && deltaY < 30) {
            // delay by one tick so we can cancel the 'tap' event if 'scroll' fires
            // ('tap' fires before 'scroll')
            tapTimeout = setTimeout(function() {

              // trigger universal 'tap' with the option to cancelTouch()
              // (cancelTouch cancels processing of single vs double taps for faster 'tap' response)
              touch.el.trigger('tap', { cancelTouch: cancelAll });

            }, 0);
          } else {
            touch = {};
          }
        deltaX = deltaY = 0;

      })
      // when the browser window loses focus,
      // for example when a modal dialog is shown,
      // cancel all ongoing events
      .on('touchcancel', cancelAll);

  };
  window.xGesture = gst;
})(window, xEvent);
