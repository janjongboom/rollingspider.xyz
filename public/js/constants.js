(function(exports) {
  'use strict';

  var address = location.pathname.replace(/^\/fly\//, '')
    .replace(/(\w)(\w)(?!$)/g, '$1$2:');

  exports.Constants = Object.freeze({
    RS_ADDRESSES: [
      address
    ],
    CHARACTERISTICS: {
      CCCD: '00002902-0000-1000-8000-00805f9b34fb',
      FA0A: '9a66fa0a-0800-9191-11e4-012d1540cb8e',
      FA0B: '9a66fa0b-0800-9191-11e4-012d1540cb8e',
      FA0C: '9a66fa0c-0800-9191-11e4-012d1540cb8e',
      FB0E: '9a66fb0e-0800-9191-11e4-012d1540cb8e',
      FB0F: '9a66fb0f-0800-9191-11e4-012d1540cb8e'
    }
  });
} (window));