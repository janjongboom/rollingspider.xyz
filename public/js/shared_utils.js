/*
 * global asyncStorage
 */
(function(exports) {
  'use strict';
  exports.SharedUtils = {
    nodeListToArray: function su_nodeListToArray(obj) {
      return [].map.call(obj, function(element) {
        return element;
      });
    },

    addMixin: function su_addMixin(obj, mixin) {
      for (var prop in mixin) {
        if (mixin.hasOwnProperty(prop)) {
          if (!obj.prototype.hasOwnProperty(prop)) {
            obj.prototype[prop] = mixin[prop];
          }
        }
      }
    },

    ab2str: function su_ab2str(buf) {
      var result = '';
      var array = new Uint8Array(buf);
      for(var i = 0; i<array.length; i++){
        result += Number(array[i]) + ',';
      }
      return result;
    },

    convertFloat2Bytes: function su_convertFloat2Bytes(floatValue) {
      var buffer = new ArrayBuffer(8);
      var intView = new Uint8Array(buffer);
      var floatView = new Float64Array(buffer);
      floatView[0] = floatValue;

      return intView;
    }

  };

}(window));
