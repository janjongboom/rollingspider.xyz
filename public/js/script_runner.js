/* globals Constants */
(function(exports) {
  'use strict';
  var ScriptRunner = function() {
  };

  // Input script should parsed in the following format:
  // [
  //    [tilt, forward, turn, up],
  //    [tilt, forward, turn, up],
  //    ...
  // ]
  // Notice that tilt, forward, turn, and up are all integers
  ScriptRunner.prototype = {
    _timeout: 100,

    _tasks: [],

    _intervalId: undefined,

    init: function(options) {
      var that = this;
      this._rsHelper = options.rsHelper;
      this._script = options.script;

      this._rsHelper.on('disconnect', function() {
        if (that._intervalId) {
          window.clearInterval(that._intervalId);
          that._intervalId = undefined;
        }
      });

      if (this._script) {
        this._script.forEach(function(line) {
          that._tasks.push({
            command: that._rsHelper.motors,
            tilt: line[0],
            forward: line[1],
            turn: line[2],
            up: line[3],
            scale: 0,
            steps: 2
          });
        });
        that._tasks.unshift({
          command: that._rsHelper.takeOff
        });
        // XXX: sometimes we need to call takeOff twice
        that._tasks.unshift({
          command: that._rsHelper.takeOff
        });
        that._tasks.push({
          command: that._rsHelper.landing
        });
      }
    },

    run: function() {
      if (this._tasks.length > 0 && this._rsHelper.isAbleToConnect()) {
        this._rsHelper.connect({addresses: Constants.RS_ADDRESSES}).then(function() {
          // on resolve
          this._intervalId =
            window.setInterval(this.onEachTask.bind(this), this._timeout);
        }, function() {
          // on reject
        });
      }
    },

    abortRunning: function() {
      if (this._rsHelper.isConnected() && this._intervalId) {
        window.clearInterval(this._intervalId);
        this._intervalId = undefined;
      }
    },

    onEachTask: function() {
      var task = this._tasks.pop();
      switch(task.command) {
        case this._rsHelper.takeOff:
        case this._rsHelper.landing:
          task.command.call(this._rsHelper);
          break;
        case this._rsHelper.motors:
          task.command.call(this._rsHelper, true, task.tilt, task.forward,
            task.turn, task.up, task.scale, task.steps);
          break;
      }
    }
  };


} (window));