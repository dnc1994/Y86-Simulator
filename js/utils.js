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

    window.updateDisplay = function(tReg) {
        for(entry in tReg) {
            if(document.getElementById(entry) != null) {
                $('#' + entry).html(tReg[entry]);
            }
        }
        var readAble = function(elemID, transfer) {
            $('#' + elemID).html(transfer($('#' + elemID).html()));
        };
        $('#stat').html(VM.CPU.getStat());
        $('#instruction').html(VM.CPU.getInstruction());
        $('#cycle').html(VM.CPU.getCycle());
        $('#CPI').html(VM.CPU.getCPI());
        readAble('D_stat', getStatName);
        readAble('E_stat', getStatName);
        readAble('M_stat', getStatName);
        readAble('W_stat', getStatName);
        readAble('stat', getStatName);
        readAble('D_icode', getInstructionName);
        readAble('E_icode', getInstructionName);
        readAble('M_icode', getInstructionName);
        readAble('W_icode', getInstructionName);
        readAble('D_rA', getRegisterName);
        readAble('D_rB', getRegisterName);
        readAble('E_dstE', getRegisterName);
        readAble('E_dstM', getRegisterName);
        readAble('E_srcA', getRegisterName);
        readAble('E_srcB', getRegisterName);
        readAble('M_dstE', getRegisterName);
        readAble('M_dstM', getRegisterName);
        readAble('W_dstE', getRegisterName);
        readAble('W_dstM', getRegisterName);
        readAble('F_predPC', toHexString);
        readAble('D_valC', toHexString);
        readAble('D_valP', toHexString);
        readAble('E_valA', toHexString);
        readAble('E_valB', toHexString);
        readAble('E_valC', toHexString);
        readAble('M_valA', toHexString);
        readAble('M_valE', toHexString);
        readAble('W_valE', toHexString);
        readAble('W_valM', toHexString);
        $('#ZF').html(VM.CPU.getZF());

        for (var i = 0; i < 8; ++ i) {
            var $Node = $('#' + getRegisterName(i));
            var pre = $Node.html();
            $Node.html(VM.R[getRegisterName(i)]);
            readAble(getRegisterName(i), toHexString);
            if($Node.html() != pre) {
                $Node.parent().finish();
                var curColor = $Node.parent().css("background-color");
                $Node.parent().css("background-color", "#88FF88").animate({
                    backgroundColor: curColor
                }, 500);
            }
        }
    };
})();
