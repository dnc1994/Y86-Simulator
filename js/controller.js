/*
 * File: controller.js
 * Author: Zhang Linghao <zlhdnc1994gmail.com>
 */

(function(){
    // YO文件的载入和解析
    window.YOLoaded = false;

    window.YOSyntaxError = function(lineNum) {
        this.lineNum = lineNum;
        this.msg = "Invalid syntax at line " + (lineNum + 1);
    };

    window.YOSyntaxError.prototype.toString = function() {
        return this.msg;
    };

    window.YOReload = function(needUpdate) {
        window.stopTimer();
        if (typeof YOLoaded == 'undefined') {
            $('#drop_area').text("Nothing loaded :(").html();
        }
        YOLoader(window.YOData, window.YOName, needUpdate);
    };

    // YO Parser
    window.YOLoader = function(data, fileName, needUpdate) {
        console.log("YOLoader Triggered");
        window.YOData = data;
        window.YOName = fileName;
        var lines = data.split("\n");
        window.VM.M = new Memory();
        window.VM.R = new Registers();

        var pattern = /^\s*0x([0-9a-f]+)\s*:(?:\s*)([0-9a-f]*)\s*(?:\|(?:.*))$/i;
        var empty_pattern = /^\s*((?:\|).*)?$/;
        try {
            for (var i = 0; i < lines.length; ++ i) {
                lines[i] = $.trim(lines[i]);
                if (empty_pattern.test(lines[i]))
                    continue;

                var match = pattern.exec(lines[i]);
                if (match == null)
                    throw new YOSyntaxError(i);
                if (match[2].length % 2 == 1)
                    throw new YOSyntaxError(i);

                var addr = parseInt(match[1], 16);
                for (var cPos = 0; cPos < match[2].length; cPos += 2, ++ addr) {
                    var tmpByte = parseInt(match[2][cPos] + match[2][cPos + 1], 16);
                    //console.log(i, tmpByte, match[1], match[2]);
                    VM.M.writeByte(addr, tmpByte);
                }
            }
            $('#status').html(fileName + " loaded.");
        }
        catch (e) {
            $('#status').text("File " + fileName + ": " + e.toString());
        }

        VM.CPU = new CPU();
        if (needUpdate || !window.YOLoaded)
            updateDisplay(VM.CPU.getInput());
        window.YOLoaded = true;
        $('#save_filename').val(fileName.slice(0, -3));
    };

    // 输出结果
    window.saveResult = function() {
        if (typeof YOLoaded == 'undefined') {
            alert('Nothing loaded :(');
            return;
        }

        YOReload();
        var result = '';
        var nCycle = 0;

        while (true) {
            var state = VM.CPU.getInput();

            result += 'Cycle_' + nCycle.toString() + '\n';
            result += '--------------------\n';
            result += 'FETCH:\n';
            result += '\tF_predPC \t= ' + toHexString(state.F_predPC) + '\n\n';
            result += 'DECODE:\n';
            result += '\tD_icode  \t= ' + toHexString(state.D_icode, 0) + '\n';
            result += '\tD_ifun   \t= ' + toHexString(state.D_ifun, 0) + '\n';
            result += '\tD_rA     \t= ' + toHexString(state.D_rA, 0) + '\n';
            result += '\tD_rB     \t= ' + toHexString(state.D_rB, 0) + '\n';
            result += '\tD_valC   \t= ' + toHexString(state.D_valC) + '\n';
            result += '\tD_valP   \t= ' + toHexString(state.D_valP) + '\n\n';
            result += 'EXECUTE:\n';
            result += '\tE_icode  \t= ' + toHexString(state.E_icode, 0) + '\n';
            result += '\tE_ifun   \t= ' + toHexString(state.E_ifun, 0) + '\n';
            result += '\tE_valC   \t= ' + toHexString(state.E_valC) + '\n';
            result += '\tE_valA   \t= ' + toHexString(state.E_valA) + '\n';
            result += '\tE_valB   \t= ' + toHexString(state.E_valB) + '\n';
            result += '\tE_dstE   \t= ' + toHexString(state.E_dstE, 0) + '\n';
            result += '\tE_dstM   \t= ' + toHexString(state.E_dstM, 0) + '\n';
            result += '\tE_srcA   \t= ' + toHexString(state.E_srcA, 0) + '\n';
            result += '\tE_srcB   \t= ' + toHexString(state.E_srcB, 0) + '\n\n';
            result += 'MEMORY:\n';
            result += '\tM_icode  \t= ' + toHexString(state.M_icode, 0) + '\n';
            result += '\tM_Bch    \t= ' + state.M_Bch + '\n';
            result += '\tM_valE   \t= ' + toHexString(state.M_valE) + '\n';
            result += '\tM_valA   \t= ' + toHexString(state.M_valA) + '\n';
            result += '\tM_dstE   \t= ' + toHexString(state.M_dstE, 0) + '\n';
            result += '\tM_dstM   \t= ' + toHexString(state.M_dstM, 0) + '\n\n';
            result += 'WRITE BACK:\n';
            result += '\tW_icode  \t= ' + toHexString(state.W_icode, 0) + '\n';
            result += '\tW_valE   \t= ' + toHexString(state.W_valE) + '\n';
            result += '\tW_valM   \t= ' + toHexString(state.W_valM) + '\n';
            result += '\tW_dstE   \t= ' + toHexString(state.W_dstE, 0) + '\n';
            result += '\tW_dstM   \t= ' + toHexString(state.W_dstM, 0) + '\n\n';

            try {
                VM.CPU.tick();
                ++ nCycle;
            }
            catch (e) {
                break;
            }
        }

        YOReload(false);

        saveAs(
            new Blob(
                [result],
                {type: "text/plain;charset=utf-8"}
            ),
            ($('#save_filename').val()) + ".txt"
        );
    };

    // 更新显示
    window.updateDisplay = function(tReg) {
        for (entry in tReg) {
            if (document.getElementById(entry) != null) {
                $('#' + entry).html(+tReg[entry]);
            }
        }
        var loadName = function(elemID, transfer) {
            $('#' + elemID).html(transfer($('#' + elemID).html()));
        };

        $('#stat').html(VM.CPU.getStat());
        $('#instruction').html(VM.CPU.getInstruction());
        $('#cycle').html(VM.CPU.getCycle());
        $('#CPI').html(VM.CPU.getCPI());
        $('#ZF').html(+VM.CPU.getZF());
        $('#SF').html(+VM.CPU.getSF());
        $('#OF').html(+VM.CPU.getOF());
        _updateMem();

        loadName('D_stat', getStatName);
        loadName('E_stat', getStatName);
        loadName('M_stat', getStatName);
        loadName('W_stat', getStatName);
        loadName('stat', getStatName);
        loadName('D_icode', getInstructionName);
        loadName('E_icode', getInstructionName);
        loadName('M_icode', getInstructionName);
        loadName('W_icode', getInstructionName);
        loadName('D_rA', getRegisterName);
        loadName('D_rB', getRegisterName);
        loadName('E_dstE', getRegisterName);
        loadName('E_dstM', getRegisterName);
        loadName('E_srcA', getRegisterName);
        loadName('E_srcB', getRegisterName);
        loadName('M_dstE', getRegisterName);
        loadName('M_dstM', getRegisterName);
        loadName('W_dstE', getRegisterName);
        loadName('W_dstM', getRegisterName);
        loadName('F_predPC', toHexString);
        loadName('D_valC', toHexString);
        loadName('D_valP', toHexString);
        loadName('E_valA', toHexString);
        loadName('E_valB', toHexString);
        loadName('E_valC', toHexString);
        loadName('M_valA', toHexString);
        loadName('M_valE', toHexString);
        loadName('W_valE', toHexString);
        loadName('W_valM', toHexString);

        for (var i = 0; i < 8; ++ i) {
            var $Node = $('#' + getRegisterName(i));
            var pre = $Node.html();
            $Node.html(VM.R[getRegisterName(i)]);
            loadName(getRegisterName(i), toHexString);
            if ($Node.html() != pre) {
                $Node.parent().finish();
                var curColor = $Node.parent().css("background-color");
                $Node.parent().css("background-color", "#88FF88").animate({backgroundColor: curColor}, 500);
            }
        }
    };
})();
