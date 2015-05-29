/*
 * File: controller.js
 * Author: Zhang Linghao <zlhdnc1994@gmail.com>
 */

(function(){

    window.YOSyntaxError = function(lineNum) {
        this.msg = "Invalid syntax at line " + (lineNum + 1);
    };

    window.YOSyntaxError.prototype.toString = function() {
        return this.msg;
    };

    window.YOReload = function(needUpdate) {
        window.stopTimer();
        if (!YOLoaded) {
            alert('Nothing loaded :(');
            return;
        }
        YOLoader(window.YOData, window.YOName, needUpdate);
    };

    window.YOLoaded = false;

    // YO Parser
    window.YOLoader = function(data, fileName, needUpdate) {
        console.log("YOLoader triggered.");

        window.YOData = data;
        window.YOName = fileName;
        window.VM.M = new Memory();
        window.VM.R = new Registers();

        var lines = data.split("\n");

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
                    VM.M.writeByte(addr, tmpByte);
                }
            }
            $('#status').html(fileName + " loaded.");
        }
        catch (e) {
            $('#status').text("File " + fileName + ": " + e.toString());
            return;
        }

        window.YOLoaded = true;
        window.maxMemListAddr = -4;
        $('#status').addClass('status_loaded');
        $('#save_filename').val(fileName.slice(0, -3));
        $('#mem_list').html('<div id="ebp_ptr" class="stack_ptr"><span class="glyphicon glyphicon-arrow-left"></span> EBP</div><div id="esp_ptr" class="stack_ptr"><span class="glyphicon glyphicon-arrow-left"></span> ESP</div>');
        renderCode(YOData);

        VM.CPU = new CPU();
        if (needUpdate || !window.YOLoaded)
            updateDisplay(VM.CPU.getInput());
    };

    // 输出运行结果
    window.saveResult = function() {
        if (!YOLoaded) {
            alert('Nothing loaded :(');
            return;
        }

        YOReload(false);
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

    // 输出汇编结果
    window.saveAssembleResult = function() {
        saveAs(
            new Blob(
                [YOData],
                {type: "text/plain;charset=utf-8"}
            ),
            window.YOName
        );
    };

    // 计时器
    window.startTimer = function(freq) {
        freq = parseFloat(freq);
        if (freq < 1e-8) alert("Invalid frequency!");
        if (freq > 999) alert("Too fast!");
        var delay = Math.round(1000 / freq);
        if (window.clockTimer) window.clearInterval(window.clockTimer);
        window.clockTimer = window.setInterval(function(){ if(!nextStep()) stopTimer();}, delay);
    };

    window.stopTimer = function() {
        if (window.clockTimer) window.clearInterval(window.clockTimer);
        window.clockTimer = undefined;
    };

    // 渲染代码显示窗口
    window.renderCode = function(data) {
        var container = $('<ol></ol>');
        data.replace(/ /g, '&nbsp;').split('\n').forEach(function (line) {
            container.append($('<li></li>').html(line));
        });
        $('#code_box_content').append(container);
    };

    window.updateMem = function() {
        var num = parseInt($('#mem_addr').val());
        if (isNaN(num))
            num = parseInt($('#mem_addr').val(), 16);
        if (isNaN(num)) {
            $('#mem_val').html('Invalid Addr');
            return;
        }
        $('#mem_val').html(toHexString(VM.M.readUnsigned(num)));
    };

    // 更新显示
    window.updateDisplay = function(tReg) {
        console.log('updateDisplay triggered.');

        for (entry in tReg) {
            if (document.getElementById(entry) != null) {
                $('#' + entry).html(+tReg[entry]);
            }
        }

        // 更新运行状态显示
        $('#stat').html(VM.CPU.getStat());
        $('#instruction').html(VM.CPU.getInstruction());
        var nCycle= VM.CPU.getCycle();
        var vCPI = VM.CPU.getCPI();
        $('#cycle').html(nCycle);
        $('#CPI').html(vCPI);
        window.CPIcycles[nCycle] = nCycle;
        window.CPIvalues[nCycle] = vCPI;
        $('#ZF').html(+VM.CPU.getZF());
        $('#SF').html(+VM.CPU.getSF());
        $('#OF').html(+VM.CPU.getOF());
        updateMem();

        // 更新流水线寄存器显示
        var loadName = function(elemID, transfer) {
            $('#' + elemID).html(transfer($('#' + elemID).html()));
        };
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

        // 更新寄存器显示
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

        // 修正当前最大有效地址
        var m = VM.M.maxMemAddr, b = VM.R.R_EBP, s = VM.R.R_ESP, r = m % 4;
        //console.log(m, b, s, r);
        m -= !r ? 0 : r;
        if (b > m) m = b;
        if (s > m) m = s;
        VM.M.maxMemAddr = Math.min(m, 1024);

        //console.log('maxMem', window.maxMemListAddr, VM.M.maxMemAddr);

        // 更新内存显示
        for (var addr = 0; addr <= window.maxMemListAddr; addr += 4) {
            //console.log('addr: ' + addr);
            var val = toLittleEndian(padHex(VM.M.readUnsigned(addr)));
            //console.log('memchange: ' + addr + ' -> ' + val);
            $('#memval_' + addr).text(val);
        }

        // 创建新内存显示单元
        if (window.maxMemListAddr < VM.M.maxMemAddr) {
            for (var addr = window.maxMemListAddr + 4; addr <= VM.M.maxMemAddr; addr += 4) {
                //console.log('addr: ' + addr);
                var val = toLittleEndian(padHex(VM.M.readUnsigned(addr)));
                var addrID = 'memaddr_' + addr.toString();
                var valID = 'memval_' + addr.toString();
                var addrStr = '<span id=' + addrID + ' class="Maddr">' + padHex(addr, 4) + '</span>';
                var valStr = '<span id=' + valID + ' class="Mval">' + val + '</span>';
                $('#mem_list').append($('<div>' + addrStr + valStr + '</div>'));
            }
        }
        window.maxMemListAddr = VM.M.maxMemAddr;

        // 更新 %ebp %esp 指针显示
        var ebp = toUnsigned(VM.R.R_EBP) > 1024 ? '#none_ptr' : '#memaddr_' + toUnsigned(VM.R.R_EBP);
        var esp = toUnsigned(VM.R.R_ESP) > 1024 ? '#none_ptr' : '#memaddr_' + toUnsigned(VM.R.R_ESP);
        // 出于前端性能考虑只显示前 1024 位内存
        if (ebp == '#none_ptr' || esp == '#none_ptr') return;
        //console.log(ebp, esp);
        $('#ebp_ptr').css('top', $(ebp)[0].offsetTop + 'px');
        $('#esp_ptr').css('top', $(esp)[0].offsetTop + 'px');
        $('#mem_monitor').finish();
        $('#mem_monitor').animate({
            scrollTop: $(ebp)[0].offsetTop - 250
        }, 300);
    };


    window.APlay = function(filename, mute){
        if (typeof mute === 'undefined') mute = 0;
        if (mute) return;
        var audio = new Audio('audio/' + filename + '.mp3');
        audio.play();
    };

})();
