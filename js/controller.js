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

    // 重置
    window.YOReload = function(needUpdate) {
        window.stopTimer();
        if (!window.YOLoaded) {
            alert('Nothing loaded :(');
            return;
        }
        window.YOLoader(window.YOData, window.YOName, needUpdate, false);
    };

    window.YOLoaded = false;

    // YO Parser
    window.YOLoader = function(data, fileName, needUpdate, needPreRun) {
        console.log("YOLoader triggered.");

        if (typeof preRun == 'undefined') preRun = false;

        window.YOData = data;
        window.YOName = fileName;
        window.VM.M = new Memory();
        window.VM.R = new Registers();
        window.VM.C = new Cache();

        var lines = data.split("\n");

        var insPattern = /^\s*0x([0-9a-f]+)\s*:(?:\s*)([0-9a-f]*)\s*(?:\|(?:.*))$/i;
        var emptyPattern = /^\s*((?:\|).*)?$/;
        try {
            for (var i = 0; i < lines.length; ++ i) {
                lines[i] = $.trim(lines[i]);
                if (emptyPattern.test(lines[i]))
                    continue;

                var match = insPattern.exec(lines[i]);
                if (match == null)
                    throw new YOSyntaxError(i);
                if (match[2].length % 2 == 1)
                    throw new YOSyntaxError(i);

                var addr = parseInt(match[1], 16);
                for (var cPos = 0; cPos < match[2].length; cPos += 2, ++ addr) {
                    var tmpByte = parseInt(match[2][cPos] + match[2][cPos + 1], 16);
                    window.VM.M.writeByte(addr, tmpByte);
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
        $('#status').addClass('status_loaded').mouseenter(function () {
            $('#status-after').html(this.innerText).css('opacity', 1);
        }).mouseleave(function () {
            $('#status-after').css('opacity', 0);
        });
        $('#save_filename').val(fileName.slice(0, -3));
        $('#mem_list').html('<div id="ebp_ptr" class="stack_ptr"><span class="glyphicon glyphicon-arrow-left"></span> EBP</div><div id="esp_ptr" class="stack_ptr"><span class="glyphicon glyphicon-arrow-left"></span> ESP</div>');

        window.VM.CPU = new CPU();
        if (needUpdate || !window.YOLoaded)
            updateDisplay(VM.CPU.getInput());

        if (needPreRun) {
            renderCode(YOData);
            // 载入的是 .yo 文件, 调用 YODump 进行反汇编
            if (!YSLoaded) {
                YODump(YOData);
                // 渲染代码窗口并添加保存按钮
                renderCode(DumpData);
                $('#code_box_title p').append($('<button id="code_box_save_dump"><i class="glyphicon glyphicon-floppy-disk"></i> Save .dump file</button>'))
            }
            preRun();
        }
    };

    window.maxCycle = 0;

    // 预先获取运行结果, 提高体验
    window.preRun = function() {
        window.mute = true;

        var result = '';
        var nCycle = 0;

        while (true) {
            var state = window.VM.CPU.getInput();

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

            /*
            result += '\tZF\t= ' + VM.CPU.getZF() + '\n';
            result += '\tSF\t= ' + VM.CPU.getSF() + '\n';
            result += '\tOF\t= ' + VM.CPU.getOF() + '\n';
            */

            try {
                VM.CPU.tick();
                window.maxCycle = ++ nCycle;
            }
            catch (e) {
                break;
            }
        }

        window.runResult = result;

        window.mute = false;
        window.YOReload(false);
    };

    // 保存运行/汇编/反汇编结果为文件
    window.saveResult = function(data, filename) {
        if (!window.YOLoaded) {
            alert('Nothing loaded :(');
            return;
        }

        saveAs(
            new Blob(
                [data],
                {type: "text/plain;charset=utf-8"}
            ),
           filename
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

    // 暂停
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

    // 更新内存监视器
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
        $('#cache_hit').html(VM.C.countCacheHit);
        $('#cache_miss').html(VM.C.countCacheMiss);
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
            $Node.html(window.VM.R[getRegisterName(i)]);
            loadName(getRegisterName(i), toHexString);
            // 闪烁动画
            if ($Node.html() != pre) {
                $Node.parent().finish();
                var curColor = $Node.parent().css("background-color");
                $Node.parent().css("background-color", "#88FF88").animate({backgroundColor: curColor}, 500);
                APlay('biu');
            }
        }

        // 修正当前最大有效地址
        var m = window.VM.M.maxMemAddr, b = window.VM.R.R_EBP, s = window.VM.R.R_ESP, r = m % 4;
        //console.log(m, b, s, r);
        m -= !r ? 0 : r;
        if (b > m) m = b;
        if (s > m) m = s;
        window.VM.M.maxMemAddr = Math.min(m, 1024);

        //console.log('maxMem', window.maxMemListAddr, VM.M.maxMemAddr);

        // 更新内存显示
        for (var addr = 0; addr <= window.maxMemListAddr; addr += 4) {
            //console.log('addr: ' + addr);
            var val = toLittleEndian(padHex(window.VM.M.readUnsignedThrough(addr)));
            //console.log('memchange: ' + addr + ' -> ' + val);
            $('#memval_' + addr).text(val);
        }

        // 创建新内存显示单元
        if (window.maxMemListAddr < window.VM.M.maxMemAddr) {
            for (var addr = window.maxMemListAddr + 4; addr <= window.VM.M.maxMemAddr; addr += 4) {
                //console.log('creating elem for addr: ' + addr);
                var val = toLittleEndian(padHex(VM.M.readUnsignedThrough(addr)));
                var addrID = 'memaddr_' + addr.toString();
                var valID = 'memval_' + addr.toString();
                var addrStr = '<span id=' + addrID + ' class="mem_addr">' + padHex(addr, 4) + '</span>';
                var valStr = '<span id=' + valID + ' class="mem_val">' + val + '</span>';
                $('#mem_list').append($('<div>' + addrStr + valStr + '</div>'));
            }
        }
        window.maxMemListAddr = window.VM.M.maxMemAddr;

        // 更新 %ebp %esp 指针显示, 出于前端性能考虑只显示前 1024 位内存
        var ebp = toUnsigned(VM.R.R_EBP) > 1024 ? '#none_ptr' : '#memaddr_' + toUnsigned(VM.R.R_EBP);
        var esp = toUnsigned(VM.R.R_ESP) > 1024 ? '#none_ptr' : '#memaddr_' + toUnsigned(VM.R.R_ESP);
        if (ebp == '#none_ptr' || esp == '#none_ptr') return;
        //console.log(ebp, esp);
        $('#ebp_ptr').css('top', $(ebp)[0].offsetTop + 'px');
        $('#esp_ptr').css('top', $(esp)[0].offsetTop + 'px');
        // 滚动动画
        $('#mem_list_container').finish();
        $('#mem_list_container').animate({
            scrollTop: $(esp)[0].offsetTop - 250
        }, 300);
    };

    // 生成 CPI 图
    window.genChart = function() {
        var data = {
            labels : window.CPIcycles,
            datasets : [
                {
                    fillColor : "rgba(220,220,220,0.5)",
                    strokeColor : "rgba(220,220,220,1)",
                    pointColor : "rgba(20,20,20,0.5)",
                    pointStrokeColor : "#fff",
                    data : window.CPIvalues
                }
            ]
        };
        var ctx = $('#perf_canvas').get(0).getContext("2d");
        var nChart = new Chart(ctx).Line(data);
    };

    // 生成性能分析表格
    window.genTable = function() {
        window.VM.CPU.getCPI(true);

        var hit = window.VM.C.countCacheHit, miss = window.VM.C.countCacheMiss;
        var total = hit + miss;
        var p_hit = ((hit / total) * 100).toFixed(1);
        var p_miss = (100 - p_hit).toFixed(1);
        window.cache_table = '<table class="tg"><tr><th class="tg-vc88">Hit/Miss</th><th class="tg-vc88">Count</th><th class="tg-vc88">Percentage</th></tr><tr><td class="tg-vyw9">Hit</td><td class="tg-vyw9">' + hit + '</td><td class="tg-vyw9">' + p_hit + '%</td></tr><tr><td class="tg-vyw9">Miss</td><td class="tg-vyw9">' + miss + '</td><td class="tg-vyw9">' + p_miss + '%</td></tr><tr><td class="tg-vyw9">Total</td><td class="tg-vyw9">' + total + '</td><td class="tg-vyw9"></td></tr></table>';

        $('#perf_cache_table').html(window.cache_table);
        $('#perf_hazard_table').html(window.hazard_table);

    };


    window.AudioList = [];

    window.AudioList['biu'] = new Audio('audio/biu.mp3');
    window.AudioList['wolai'] = new Audio('audio/wolai.mp3');
    window.AudioList['caoniba'] = new Audio('audio/caoniba.mp3');
    window.AudioList['meiguoshengdiyage'] = new Audio('audio/meiguoshengdiyage.mp3');

    window.mute = false;

    window.APlay = function(name){
        if (window.mute) return;
        window.AudioList[name].play();
    };

})();
