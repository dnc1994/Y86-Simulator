/*
 * File: utils.js
 * Author: Zhang Linghao <zlhdnc1994@gmail.com>
 */

(function() {

    window.AssertError = function(msg) {
        this.message = msg;
    };
    window.AssertError.prototype.toString = function() {
        return this.msg;
    };

    window.assert = function(bool) {
        if (typeof bool == 'undefined') throw new AssertError("Assertion failed. Result is undefined.");
        if (bool === false) throw new AssertError("Assertion failed. Result is false.");
        if (bool === null) throw new AssertError("Assertion failed. Result is null.");
        if (typeof bool == 'number') {
            if (bool % 1 == 0 && bool == 0) throw new AssertError("Assertion failed. Result is 0.");
            if (Math.abs(bool) < 1e-8) throw new AssertError("Assertion failed. Result is smaller than EPS(1e-8).");
            return ;
        }
        if (typeof bool == 'string') {
            if(bool.length == 0) throw new AssertError("Assertion failed. Result is empty string.");
            return ;
        }
        if (!bool) throw new AssertError("Assertion failed. Result is regarded as false.");
    };

    window.isInt = function(n) {
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

    // 解析 10/16 进制数字
    window.parseNumber = function(str) {
        if (isNaN(str))
            throw new Error('Not a number: ' + str);
        else if (str.length > 2 && str.substr(0, 2) === '0x')
            return parseInt(str, 16);
        else
            return parseInt(str, 10);
    };

    // 转换并填充为 len 位 16 进制字符串
    window.padHex = function(data, len) {
        if (typeof len === 'undefined') len = 8;
        data = parseInt(data);
        data = toUnsigned(data);
        var tHex = data.toString(16);
        return (new Array(len + 1 - tHex.length)).join('0') + tHex;
    };

    // 在 padHex 的结果之前加上 0x
    window.toHexString = function(data, len) {
        return '0x' + padHex(data, len);
    };

    // 转换为小端表示
    window.toLittleEndian = function(str) {
        if (str.length % 2 == 1) str = '0' + str;
        var result = '';
        for (i = str.length; i > 0; i -= 2)
            result += str.substr(i - 2, 2);
        return result;

    };
})();
