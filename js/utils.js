/*
 * File: constants.js
 * Author: Zhang Linghao <zlhdnc1994gmail.com>
 */

(function() {
    window.AssertError = function(msg) { this.message = msg; };
    window.AssertError.prototype.toString = function() { return this.msg; };
    window.assert = function(bool) {
        if (typeof bool == 'undefined') throw new AssertError("Assertion failed. Result is undefined.");
        if (bool === false) throw new AssertError("Assertion failed. Result is false.");
        if (bool === null) throw new AssertError("Assertion failed. Result is null.");
        if (typeof bool == 'number') {
            if(bool % 1 == 0 && bool == 0) throw new AssertError("Assertion failed. Result is 0.");
            if(Math.abs(bool) < 1e-8) throw new AssertError("Assertion failed. Result is smaller than EPS(1e-8).");
            return ;
        }
        if (typeof bool == 'string') {
            if(bool.length == 0) throw new AssertError("Assertion failed. Result is empty string.");
            return ;
        }
        // Default
        if (!bool) throw new AssertError("Assertion failed. Result is regarded as false.");
    };

    window.isInt = function(n) {
        // uint32.
        return typeof n == 'number' && n % 1 == 0;
    };

    window.isSigned = function(n) {
        return isInt(n) && n >= -2147483648 && n < 2147483648;
    };

    window.isUnsigned = function(n) {
        return isInt(n) && n >= 0 && n < 4294967296;
    };

    window.toSigned = function(n) {
        assert(isInt(n));
        return n | 0;
    };

    window.toUnsigned = function(n) {
        assert(isInt(n));
        return n >>> 0;
    };

    window.toHexString = function(data) {
        data = parseInt(data);
        data = toUnsigned(data);
        var tHex = data.toString(16);
        return "0x" + (new Array(9 - tHex.length)).join('0') + tHex;
    };

    window.toHexChar = function(data) {
        data = parseInt(data);
        data = toUnsigned(data);
        var tHex = data.toString(16);
        return '0x' + tHex;
    }
})();
