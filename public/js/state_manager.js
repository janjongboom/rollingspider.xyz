(function(exports) {
  'use strict';

  var StateManager = function(rollingSpider) {
    this._state = StateManager.STATES.DISCONNECT;
    this._rollingSpider = rollingSpider;
  };

  StateManager.STATES = Object.freeze({
    CONNECTED: 'connected',
    CONNECTING: 'connecting',
    DISCONNECT: 'disconnect'
  });

  StateManager.prototype = evt({

    set state (to) {
      if (to !== this._state) {
        this._state = to;
        this.fire('state-changed', to);
      }
    },

    get state() {
      return this._state;
    },

    _rollingSpider: undefined,

    _eventNames: [
      'scanning-start',
      'scanning-stop',
      'finding-device',
      'gatt-device-found',
      'connecting',
      'connected',
      'disconnect',
      'connecting-failed',
      'discovering-services'
    ],

    start: function() {
      var that = this;
      this._eventNames.forEach(function(eventName) {
        that._rollingSpider.on(eventName,
          that.handleEvent.bind(that, eventName));
      });
      return this;
    },

    stop: function() {
      this._rollingSpider = undefined;
    },

    isAbleToConnect: function() {
      return this.state === StateManager.STATES.DISCONNECT;
    },

    isConnected: function() {
      return this.state === StateManager.STATES.CONNECTED;
    },

    handleEvent: function(eventName, detail) {
      if (detail) {
        if (detail instanceof Error) {
          console.log('[EVENT] ' + eventName);
          console.warn(detail);
        } else {
          console.log('[EVENT] ' + eventName + ': ' + JSON.stringify(detail));
        }
      } else {
        console.log('[EVENT] ' + eventName);
      }
      switch(eventName) {
        case 'connected':
          this.state = StateManager.STATES.CONNECTED;
          break;
        case 'connecting':
          this.state = StateManager.STATES.CONNECTING;
          break;
        case 'connecting-failed':
        case 'disconnect':
          this.state = StateManager.STATES.DISCONNECT;
          break;
      }
    }
  });

  exports.StateManager = StateManager;

}(window));
