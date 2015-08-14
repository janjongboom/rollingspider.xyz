/* globals console, VirtualJoystick, RollingSpiderHelper, CSV, Constants */
'use strict';

var App = {
  isReady: false,

  rsHelper: undefined,
  joystickLeft: undefined,
  joystickRight: undefined,

  _intervalId: undefined,

  connectButton: document.getElementById('connect'),
  flyingStatusSpan: document.getElementById('flyingStatus'),
  joystickAreaDiv: document.getElementById('joystickArea'),
  leftDebugInfoElem: document.querySelector('#info > .left'),
  rightDebugInfoElem: document.querySelector('#info > .right'),
  bluetoothInfoElem: document.querySelector('#info > .center'),
  gistIdElem: document.getElementById('gist-id'),
  scriptElem: document.getElementById('script'),

  viewStatus: document.body.className, // on-joystick-view or on-scripting-view
  joystickViewSection: document.getElementById('joystick-view'),
  scriptingViewSection: document.getElementById('scripting-view'),

  gistEndpoint: 'https://api.github.com/gists/',

  buttonIds: [
    'takeoff',
    'landing',
    'frontFlip',
    'to-scripting-view',
    'to-joystick-view',
    'run-script',
    'import-script',
    'load-demo-script'
  ],

  showDebugInfo: function showDebugInfo(tilt, forward, turn, up) {
    this.leftDebugInfoElem.innerHTML = 'tilt:' + tilt +
      ' <br>forward:' + forward + '<br>' +
      (this.joystickLeft.right() ? ' right':'') +
      (this.joystickLeft.up()  ? ' up'   : '') +
      (this.joystickLeft.left()  ? ' left' : '') +
      (this.joystickLeft.down()  ? ' down'   : '');

    var eRight = document.querySelector('#info > .right');
    eRight.innerHTML = 'turn:' + turn +
      ' <br>up:' + up + '<br>' +
      (this.joystickRight.right() ? ' right'  : '') +
      (this.joystickRight.up()  ? ' up'   : '') +
      (this.joystickRight.left()  ? ' left' : '') +
      (this.joystickRight.down()  ? ' down'   : '');
  },

  onJoystickTouch: function(joystick, evt) {
    switch(evt.type) {
      case 'touchstart':
        joystick.onTouch = true;
        console.log(joystick.location + ' down');
        break;
      case 'touchend':
        joystick.onTouch = false;
        console.log(joystick.location + ' up');
        break;
    }
  },

  createJoystick: function createJoystick(location) {
    var that = this;
    var joystick = new VirtualJoystick({
      container: this.joystickAreaDiv,
      strokeStyle: 'white', // location === 'left' ? 'cyan' : 'orange',
      baseX: location === 'left' ?
        (document.body.clientWidth/2)*0.5 : (document.body.clientWidth/2)*1.5,
      baseY: (document.body.clientHeight/2),
      stationaryBase: true,
      limitStickTravel: true,
      stickRadius: 80,
      mouseSupport: false
    });
    joystick.location = location;

    joystick.addEventListener('touchStart',
      this.onJoystickTouch.bind(this, joystick));
    joystick.addEventListener('touchEnd',
      this.onJoystickTouch.bind(this, joystick));
    joystick.addEventListener('touchStartValidation', function(event) {
      var touch = event.changedTouches[0];
      var notValid = joystick.location === 'left' ?
        touch.pageX >= window.innerWidth/2 : touch.pageX < window.innerWidth/2;

      if(notValid) {
        return false;
      }
      return true;
    });
    return joystick;
  },

  monitorJoystickMovement: function monitorJoystickMovement() {
    var tilt = this.joystickLeft.onTouch ?
      Math.round(this.joystickLeft.deltaX()) : 0;
    var forward = this.joystickLeft.onTouch ?
      Math.round(this.joystickLeft.deltaY() * -1) : 0;
    var turn = this.joystickRight.onTouch ?
      Math.round(this.joystickRight.deltaX()) : 0;
    var up = this.joystickRight.onTouch ?
      Math.round(this.joystickRight.deltaY() * -1) : 0;

    this.showDebugInfo(tilt, forward, turn, up);
    this.rsHelper.motors(true, tilt, forward, turn, up, 0, 2);
  },

  changeConnectButtonText: function changeConnectButtonText(state) {
    var elem = this.connectButton;
    switch (state) {
      case 'connecting':
        elem.disabled = true;
        break;
      case 'discovering-services':
        elem.disabled = true;
        break;
      case 'connected':
        elem.textContent = 'Disconnect';
        elem.disabled = false;
        this.bluetoothInfoElem.textContent = 'Connected';
        break;
      case 'disconnect':
        elem.textContent = 'Connect';
        elem.disabled = false;
        break;
    }
  },

  unpackDataFromGist: function(response) {
    var files = response.files;
    var content = '';
    Object.keys(files).some(function(filename) {
      content = files[filename].content;
      return true;
    });
    return content;
  },

  importScript: function importScript() {
    var that = this;
    var gistId = this.gistIdElem.value;
    if (gistId) {
      var url = this.gistEndpoint + gistId;
      var request = new XMLHttpRequest({mozAnon: true, mozSystem: true});
      request.open('GET', url, true);
      request.responseType = 'json';
      request.onreadystatechange = function() {
        if (request.readyState === 4) {
          if (request.status === 200) {
            var scriptContent = that.unpackDataFromGist(request.response);
            that.scriptElem.textContent = scriptContent;
            // XXX
          } else {
            console.log('Error: ' + request.statusText);
          }
        }
      };
      request.send();
    }
  },

  parseScript: function() {
    var scriptContent = this.scriptElem.textContent;
    var parsedScript = [];
    if (scriptContent && scriptContent.trim().length > 0) {
      parsedScript = CSV.parse(scriptContent);
    }
    console.log(parsedScript);
    return parsedScript;
  },

  handleEvent: function handleEvent(evt) {
    var targetId = evt.target.id;
    console.log('click on ' + targetId);
    switch(targetId) {
      case 'to-scripting-view':
      case 'to-joystick-view':
        this.changeView();
        break;
      case 'takeoff':
        this.rsHelper.takeOff();
        break;
      case 'landing':
        this.rsHelper.landing();
        break;
      case 'frontFlip':
        this.rsHelper.frontFlip();
        break;
      case 'import-script':
        this.importScript();
        break;
      case 'run-script':
        this.parseScript();
        break;
      case 'load-demo-script':
        break;
    }
  },

  changeView: function changeView() {
    if (this.viewStatus === 'on-joystick-view') {
      document.body.className = this.viewStatus = 'on-scripting-view';
      this.joystickViewSection.classList.add('hidden');
      this.scriptingViewSection.classList.remove('hidden');
    } else {
      document.body.className = this.viewStatus = 'on-joystick-view';
      this.scriptingViewSection.classList.add('hidden');
      this.joystickViewSection.classList.remove('hidden');
    }
  },

  initUi: function() {
    this.joystickLeft = this.createJoystick('left');
    this.joystickRight = this.createJoystick('right');
  },

  init: function init() {
    var that = this;
    console.log("touchscreen is " +
      (VirtualJoystick.touchScreenAvailable() ? "available" : "not available"));

    if (!this.isReady) {
      this.rsHelper = new RollingSpiderHelper();

      var ui = {
        'connecting': 'Connecting',
        'discovering-services': 'Discovering services',
        'connected': 'Connected',
        'disconnect': 'Disconnected',
        'scanning-start': 'Start scanning',
        'finding-device': 'Finding device',
        'scanning-stop': 'Stop scanning',
        'gatt-connecting': 'Connecting GATT',
        'connecting-failed': 'Connection failed'
      };

      // XXX
      ['connecting', 'discovering-services', 'connected', 'disconnect',
        'scanning-start', 'finding-device', 'scanning-stop',
        'gatt-connecting', 'connecting-failed'].forEach(
          function(eventName) {
        that.rsHelper.on(eventName, function(data) {
          that.changeConnectButtonText(eventName);
          that.bluetoothInfoElem.textContent = ui[eventName] || eventName;
          if (data && typeof data === 'string') {
            that.bluetoothInfoElem.textContent += ': ' + data;
          }
          switch(eventName) {
            case 'connected':
              // start monitoring joystick movement when there is connection
              that._intervalId =
                window.setInterval(that.monitorJoystickMovement.bind(that), 50);
              break;
            case 'disconnect':
              // stop monitoring joystick movement when disconnect
              window.clearInterval(that._intervalId);
              that._intervalId = undefined;
              break;
          }
        });
      });
      this.connectButton.addEventListener('click', function() {
        if (that.rsHelper.isAbleToConnect()) {
          that.rsHelper.connect({addresses: Constants.RS_ADDRESSES}).then(function onResolve() {
            that.changeConnectButtonText('connected');
          }, function onReject() {
            that.changeConnectButtonText('disconnect');
          });
        } else {
          that.rsHelper.disconnect().then(function onResolve() {
            that.changeConnectButtonText('disconnect');
          }, function onReject() {
            // XXX
          });
        }
      });

      this.buttonIds.forEach(function(buttonId) {
        var element = document.getElementById(buttonId);
        element.addEventListener('click', that);
      });

      /**
       * Flying statuses:
       *
       * 0: Landed
       * 1: Taking off
       * 2: Hovering
       * 3: ??
       * 4: Landing
       * 5: Emergency / Cut out
       */
      ['fsLanded', 'fsTakingOff', 'fsHovering','fsUnknown', 'fsLanding',
        'fsCutOff'].forEach(function(eventName) {
        that.rsHelper.on(eventName, function (eventName) {
          that.flyingStatusSpan.textContent = eventName;
        });
      });

      that.rsHelper.on('flying', function() {
        document.body.classList.add('flying');
      });
      that.rsHelper.on('not-flying', function() {
        document.body.classList.remove('flying');
      });

      this.isReady = true;
    }
  }
};

var width = document.body.clientWidth;
var height = document.body.clientHeight;

console.log(width, 'x', height);

if (height > width) {
  document.querySelector('#turn-phone-over').style.display = 'block';
  window.addEventListener('resize', function or() {
    width = document.body.clientWidth;
    height = document.body.clientHeight;

    if (document.body.clientWidth > document.body.clientHeight) {
      window.removeEventListener('resize', or);
      document.querySelector('#turn-phone-over').style.display = 'none';

      App.initUi();
    }
  });
}
else {
  App.initUi();
}

App.init();

(function() {
  function connect() {
    if (!App.isReady) {
      return setTimeout(function() {
        connect();
      }, 100);
    }

    App.connectButton.click();
  }

  setTimeout(function() {
    connect();
  }, 1000);
})();
