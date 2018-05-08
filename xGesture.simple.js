/**
 * xEvent.js
 * https://github.com/kiinlam/xEvent
 */

;(function (window) {
    
    // xv constructor
    var xv = function (target) {
        
        // auto use new xv()
        if( !(this instanceof xv) ){
            return new xv(target);
        }
        
        // attach to dom elem
        target._xEvent = this;
        
        // dom elem access
        this.el = target;
        
        // manage event handlers
        this.handlers = {};
    };
    
    // find valid event type strings
    function findEvents (types) {
        return (types || '').split(/\s+/).filter(function(e){
            return !!e;
        });
    }
    
    // make a DocumentEvent
    xv.Event = function (type, props) {
        var event, bubbles = true;
        if (CustomEvent) {
            event = new CustomEvent(type, typeof props === 'object' && 'detail' in props ? props : {'detail': props});
        } else {
            event = document.createEvent('Event');
            if (typeof props === 'object') {
                for (var name in props) {
                    (name == 'bubbles') ? (bubbles = !!props[name]) : (event[name] = props[name]);
                }
            }
            event.initEvent(type, bubbles, true);
        }
        return event;
    };

    // alias to prototype
    xv.fn = xv.prototype;
    
    // find all event handlers of given type
    xv.fn.findHandlers = function (type, fn) {
        var self = this;
        return (self.handlers[type] || []).filter(function (handler) {
            return handler && (!fn || fn === handler.fn);
        });
    };
    
    // find all added events
    xv.fn.findAddedEvents = function () {
        return Object.keys(this.handlers);
    };
    
    // add event listener
    xv.fn.on = function (types, callback, data, capture) {
        var self = this;
        var elem = self.el;
        elem && findEvents(types).forEach(function(type){
            var handlers = (self.handlers[type] || (self.handlers[type] = []));
            var handler = {
                i: handlers.length,
                fn: callback,
                target: elem,
                type: type,
                proxy: function(e) {
                    e.data = data;
                    var result = callback.apply(elem, e._args == undefined ? [e] : [e].concat(e._args));
                    if (result === false) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    return result;
                }
            };
            handlers.push(handler);
            self.el.addEventListener(type, handler.proxy, !!capture);
        });
        return self;
    };
    
    // remove event listener
    xv.fn.off = function (types, callback, capture) {
        var self = this,
            elem = self.el;
        elem && (types ? findEvents(types) : Object.keys(self.handlers)).forEach(function(type){
            var handlers = self.handlers[type];
            self.findHandlers(type, callback).forEach(function(handler){
                delete handlers[handler.i];
                elem.removeEventListener(type, handler.proxy, !!capture);
            });
        });
        return self;
    };
    
    // fire events with given types
    xv.fn.trigger = function (types, props) {
        var self = this,
            elem = self.el;
        elem && findEvents(types).forEach(function(type){
            event = xv.Event(type, props);
            elem.dispatchEvent(event);
        });
        return self;
    };
    
    // remove everything
    xv.fn.destroy = function () {
        this.off();
        delete this.el._xEvent;
        this.el = undefined;
        delete this.el;
        this.handlers = undefined;
        delete this.handlers;
        this.constructor = Object;
    };

    // add some alias
    // ['click', 'mousedown', 'mouseup', 'mouseenter', 'mouseout'].forEach(function(eventName){
    //     xv.fn[eventName] = function(callback){ return this.on(eventName, callback) };
    // });
    
    window.xEvent = xv;
    window.XV === undefined && (window.XV = xv);
})(window);

/**
 * xGesture.js
 * https://github.com/kiinlam/xGesture
 */

; (function (window, $) {
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

    var gst = function ($elem, option) {
        var gesture = $elem || $(document);
        var now, delta, deltaX = 0, deltaY = 0, firstTouch, prevent = true;
        option = option || {};

        gesture
            .on(_touchstart, function (e) {
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
            .on(_touchmove, function (e) {
                var moveX = moveY = 0;
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

                if (typeof option.prevent === 'function') {
                    prevent = option.prevent(touch, {moveX: moveX, moveY: moveY, deltaX: deltaX, deltaY: deltaY});
                }
                prevent && e.preventDefault();
            })
            .on(_touchend, function (e) {

                // draw end
                if ((touch.x2 && Math.abs(touch.x1 - touch.x2) > 3) ||
                    (touch.y2 && Math.abs(touch.y1 - touch.y2) > 3))

                    touch.el.trigger('drawEnd');

                // swipe
                if ((touch.x2 && Math.abs(touch.x1 - touch.x2) > 30) ||
                    (touch.y2 && Math.abs(touch.y1 - touch.y2) > 30))

                    swipeTimeout = setTimeout(function () {
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
                        tapTimeout = setTimeout(function () {

                            // trigger universal 'tap' with the option to cancelTouch()
                            // (cancelTouch cancels processing of single vs double taps for faster 'tap' response)
                            touch.el.trigger('tap', {'cancelTouch': cancelAll});

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
