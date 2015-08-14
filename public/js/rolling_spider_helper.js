/* globals StateManager, evt, console, Promise, SharedUtils, PipedPromise,
          Constants */
'use strict';

function RollingSpiderHelper() {
  this._manager = navigator.mozBluetooth;
  this._stateManager = new StateManager(this).start();
  this._isGattConnected = false;
  this._characteristics = {};
  this._motorCounter = 1;
  this._settingsCounter = 1;
  this._emergencyCounter = 1;
  this.readyToGo = false;
}

RollingSpiderHelper.prototype = evt({

  _device: undefined,

  getDeviceAddress: function() {
    if (this._device) {
      return this._device.address;
    }
    return 'unknown device';
  },

  isAbleToConnect: function() {
    return this._stateManager.isAbleToConnect();
  },

  isConnected: function() {
    // XXX: we should be able to disconnect when
    // state = StateManager.STATES.CONNECTING
    return this._stateManager.isConnected();
  },

  connect: function (options) {
    var prefix = options.deviceNamePrefix || 'RS_';
    var addresses = options.addresses;
    var that = this;
    if (this._stateManager.isAbleToConnect()) {
      this.fire('connecting');
      return new Promise(function(resolve, reject) {
        that.fire('scanning-start');
        that._startScan().then(function(/* handle */) {
          that.fire('finding-device', {prefix: prefix, addresses: addresses});
          return that._findDevice({deviceNamePrefix: prefix, addresses: addresses});
        }).then(function(device) {
          that.fire('scanning-stop');
          device.gatt.onconnectionstatechanged =
            that._gattConnectionStateChanged.bind(that);
          that._stopScan();
          that.fire('gatt-connecting');
          return that._gatt.connect();
        }).then(function() {
          that.fire('discovering-services');
          return that._discoverServices();
        }).then(function() {
          that.fire('connected');
          resolve();
        }).catch(function(reason) {
          that.fire('connecting-failed', reason);
          reject(reason);
        });
      });
    } else {
      return Promise.reject('Unable to connect in state ' + this._stateManager.state);
    }
  },

  disconnect: function() {
    var that = this;
    if (this._stateManager.isConnected() && this._gatt) {
      return this._gatt.disconnect().then(function onResolve() {
        that.fire('disconnect');
      }, function onReject(reason) {
        console.warn(reason);
      });
    } else {
      return Promise.reject(
        'Unable to disconnect in state ' + this._stateManager.state);
    }
  },

  _gattConnectionStateChanged: function() {
    var connectionState = this._gatt.connectionState;
    switch(connectionState) {
      case 'disconnected':
        this._isGattConnected = false;
        this.fire('gatt-disconnected');
        this.fire('disconnect');
        break;
      case 'disconnecting':
        this.fire('gatt-disconnecting');
        break;
      case 'connected':
        this.fire('gatt-connected');
        this._isGattConnected = true;
        break;
      case 'connecting':
        this.fire('gatt-connecting');
        break;
    }
  },

  _findDevice: function(options) {
    var namePrefix = options.deviceNamePrefix;
    var addresses = options.addresses || [];
    var that = this;
    // XXX: we should set timeout for rejection
    return new Promise(function(resolve, reject) {
      var onGattDeviceFount = function(evt) {
        var device = evt.device;
        console.log('found ' + device.name + ': ' + device.address);
        if(!that._isGattConnected &&
            (device.name.startsWith(namePrefix) ||
              addresses.indexOf(device.address) > -1)) {
          that._device = device;
          that._gatt = device.gatt;
          resolve(evt.device);
        }
      };
      that._leScanHandle.addEventListener('devicefound', onGattDeviceFount);
    });
  },

  _startScan: function StartScan(retry) {
    var that = this;
    if (!this._manager) {
      return Promise.reject('No WebBluetooth support');
    }
    if (!this._manager.defaultAdapter) {
      if (retry) {
        return Promise.reject('No adapter found. Is bluetooth enabled?');
      }
      return new Promise(function(res, rej) {
        setTimeout(function() {
          that._startScan(true).then(res, rej);
        }, 1000);
      });
    }
    if (!this._adapter) {
      this._adapter = this._manager.defaultAdapter;
    }
    return this._adapter.startLeScan([]).then(function onResolve(handle) {
      that._leScanHandle = handle;
      return Promise.resolve(handle);
    }, function onReject(reason) {
      return Promise.reject(reason);
    });
  },

  _stopScan: function StopScan(){
    this._adapter.stopLeScan(this._leScanHandle).then(function onResolve() {
      this._leScanHandle = null;
      return Promise.resolve();
    }.bind(this), function onReject(reason) {
      return Promise.reject(reason);
    }.bind(this));
  },

  takeOff: function TakeOff() {
    console.log('invoke takeOff');
    if (this._stateManager.isConnected()) {
      var characteristic = this._characteristics[Constants.CHARACTERISTICS.FA0B];

      // 4, (byte)mSettingsCounter, 2, 0, 1, 0
      var buffer = new ArrayBuffer(6);
      var array = new Uint8Array(buffer);
      array.set([4, this._settingsCounter++, 2, 0, 1, 0]);
      characteristic.writeValue(buffer).then(function onResolve(){
        console.log('takeoff success');
      }, function onReject(){
        console.log('takeoff failed');
      });
    }
  },

  landing: function Landing() {
    if (this._stateManager.isConnected()) {
      var characteristic = this._characteristics[Constants.CHARACTERISTICS.FA0B];

      // 4, (byte)mSettingsCounter, 2, 0, 3, 0
      var buffer = new ArrayBuffer(6);
      var array = new Uint8Array(buffer);
      array.set([4, this._settingsCounter++, 2, 0, 3, 0]);
      characteristic.writeValue(buffer).then(function onResolve(){
        console.log('landing success');
      }, function onReject(){
        console.log('landing failed');
      });
    }
  },

  frontFlip: function FrontFlip() { // actually rightFlip now
    if (this._stateManager.isConnected()) {
      var characteristic = this._characteristics[Constants.CHARACTERISTICS.FA0B];

      // 4, (byte)mSettingsCounter, 2, 4, 0, 0, 2, 0, 0, 0
      var buffer = new ArrayBuffer(10);
      var array = new Uint8Array(buffer);
      array.set([4, this._settingsCounter++, 2, 4, 0, 0, 2, 0, 0, 0]);
      characteristic.writeValue(buffer).then(function onResolve(){
        console.log('frontFlip success');
      }, function onReject(){
        console.log('frontFlip failed');
      });
    }
  },

  emergencyStop: function EmergencyStop(){
    var characteristic = this._characteristics[Constants.CHARACTERISTICS.FA0C];

    // 4, (byte)mSettingsCounter, 2, 0, 4, 0
    var buffer = new ArrayBuffer(6);
    var array = new Uint8Array(buffer);
    array.set([4, this._emergencyCounter++, 2, 0, 4, 0]);
    characteristic.writeValue(buffer).then(function onResolve(){
      console.log('emergencyStop success');
    }, function onReject(){
      console.log('emergencyStop failed');
    });
  },

  _sendMotorCmd: function SendMotorCmd(on, tilt, forward, turn, up, scale){
    var characteristic = this._characteristics[Constants.CHARACTERISTICS.FA0A];
    if(!characteristic || !this.readyToGo) return;

    var buffer = new ArrayBuffer(19);
    var array = new Uint8Array(buffer);
    array.fill(0);
    array.set([
      2,
      this._motorCounter++,
      2,
      0,
      2,
      0,
      (on ? 1 : 0),
      tilt & 0xFF,
      forward & 0xFF,
      turn & 0xFF,
      up & 0xFF,
      0, 0, 0, 0,
      0, 0, 0, 0
    ]);
    this._writeValuePromise(characteristic, buffer).then(function onResolve(){
      // console.log('sendMotorCmd success');
      console.log('_sendMotorCmd: ' + on + ', ' + tilt + ', ' + forward + ', ' +
        turn + ', ' + up + ', ' + scale);
    }, function onReject(reason){
      console.log('sendMotorCmd failed: ' + reason);
    });
  },

  motors: function Motors(on, tilt, forward, turn, up, scale, steps){
    for (var i = 0; i < steps; i++) {
      this._sendMotorCmd(on, tilt, forward, turn, up, scale);
    }
    return true;
  },

  _writeValuePromise: function _writeValuePromise(target, buffer) {
    return this._getPipedPromise('_writeValuePromise',
      function(resolve, reject) {
        return target.writeValue(buffer).then(resolve).catch(reject);
      });
  },

  _enableNotification: function EnableNotification(characteristic) {
    var that = this;
    var success = false;
    characteristic.startNotifications().then(function onResolve(){
      console.log('enableNotification for ' +
        characteristic.uuid + ' success');
    }, function onReject(reason){
      console.log('enableNotification for ' +
        characteristic.uuid + ' failed: ' + reason);
    });
    console.log(characteristic.descriptors);
    for (var i = 0; i < characteristic.descriptors.length; i++) {
      var descriptor = characteristic.descriptors[i];
      console.log('Descriptor CCCD uuid:' + descriptor.uuid);
      console.log('Descriptor CCCD value:' + descriptor.value);
      if (descriptor.uuid === Constants.CHARACTERISTICS.CCCD) {
        console.log('CCCD found');
        var buffer = new ArrayBuffer(2);
        var array = new Uint8Array(buffer);
        array.set([0x01, 0x00]);
        that._writeValuePromise(descriptor, buffer);
        success = true;
      }
    }
    return success;
  },

  onCharacteristicChanged: function OnCharacteristicChanged(evt) {
    var characteristic = evt.characteristic;
    var value = characteristic.value;
    console.log('The value of characteristic (uuid:' +
      characteristic.uuid + ') changed to ' + SharedUtils.ab2str(value));

    switch(characteristic.uuid){
      case Constants.CHARACTERISTICS.FB0E:
        var eventList = ['fsLanded', 'fsTakingOff', 'fsHovering',
          'fsUnknown', 'fsLanding', 'fsCutOff'];
        var array = new Uint8Array(value);
        if(eventList[array[6]] === 'fsHovering'){
          this.readyToGo = true;
        } else {
          this.readyToGo = false;
        }
        if ([1, 2, 3, 4].indexOf(array[6]) >= 0) {
          this.fire('flying');
        }
        else {
          this.fire('not-flying');
        }
        this.fire(eventList[array[6]]);
        break;
      case Constants.CHARACTERISTICS.FB0F:
        console.log('Battery: ' + SharedUtils.ab2str(value));
        break;
    }
  },

  _checkChar: function (){
    var charFB0E = this._characteristics[Constants.CHARACTERISTICS.FB0E];
    var charFB0F = this._characteristics[Constants.CHARACTERISTICS.FB0F];
    var charFA0A = this._characteristics[Constants.CHARACTERISTICS.FA0A];
    var charFA0B = this._characteristics[Constants.CHARACTERISTICS.FA0B];
    var charFA0C = this._characteristics[Constants.CHARACTERISTICS.FA0C];

    return charFB0E && charFB0F && charFA0A && charFA0B && charFA0C;
  },

  _discoverServices: function DiscoverServices() {
    var that = this;
    this._gatt.oncharacteristicchanged =
      this.onCharacteristicChanged.bind(this);

    function dumpServices(services){
      for(var i = 0; i < services.length; i++) {
        var characteristics = services[i].characteristics;
        console.log('service[' + i + ']' + characteristics.length +
          'characteristics in total');
        for(var j = 0; j < characteristics.length; j++) {
          var characteristic = characteristics[j];
          var uuid = characteristic.uuid;
          that._characteristics[uuid] = characteristic;
          console.log(uuid);
        }
      }
    }

    return new Promise(function (resolve, reject){
      function retry() {
        console.log('discover services retry...');
        setTimeout(wrapper_discoverServices, 100);
      }

      function wrapper_discoverServices(){
        that._gatt.discoverServices().then(function onResolve(){
          var services = that._gatt.services;
          dumpServices(services);

          if(that._checkChar()){
            var notificationSuccess_FB0E = that._enableNotification(
              that._characteristics[Constants.CHARACTERISTICS.FB0E]);
            var notificationSuccess_FB0F = that._enableNotification(
              that._characteristics[Constants.CHARACTERISTICS.FB0F]);
            if(!notificationSuccess_FB0E || !notificationSuccess_FB0F){
              retry();
            } else {
              console.log('discover services success');
              resolve();
            }
          } else {
            retry();
          }
        }, function onReject(reason){
          console.log('discoverServices reject: [' + reason + ']');
          reject();
        });
      }

      wrapper_discoverServices();
    });
  }
});

SharedUtils.addMixin(RollingSpiderHelper, new PipedPromise());
