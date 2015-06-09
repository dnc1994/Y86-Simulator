/*
 * File: assembler.js
 * Author: Zhang Linghao <zlhdnc1994@gmail.com>
 */

(function() {

    // 指令对应的 icode
    window.insToicode = {
        'nop' : 0,
        'halt' : 1,
        'rrmovl' : 2,
        'irmovl' : 3,
        'rmmovl' : 4,
        'mrmovl' : 5,
        'addl' : 6,
        'subl' : 6,
        'andl' : 6,
        'xorl' : 6,
        'jmp' : 7,
        'jle' : 7,
        'jl' : 7,
        'je' : 7,
        'jne' : 7,
        'jge' : 7,
        'jg' : 7,
        'call' : 8,
        'ret' : 9,
        'pushl' : 10,
        'popl' : 11,
        'iaddl' : 12
    };

    // 指令对应的 ifun
    window.insToifun = {
        'addl' : 0,
        'subl' : 1,
        'andl' : 2,
        'xorl' : 3,
        'jmp' : 0,
        'jle' : 1,
        'jl' : 2,
        'je' : 3,
        'jne': 4,
        'jge': 5,
        'jg': 6
    };

    // 指令对应的长度(Byte)
    window.insLength = [1, 1, 2, 6, 6, 6, 2, 5, 5, 1, 2, 2, 6];

    // 指令对应的语法
    window.insSyntax = {};

    insSyntax['halt'] = [];
    insSyntax['nop'] = [];
    insSyntax['rrmovl'] = ['rA', 'rB'];
    insSyntax['irmovl'] = ['V', 'rB'];
    insSyntax['rmmovl'] = ['rA', 'D(rB)'];
    insSyntax['mrmovl'] = ['D(rB)', 'rA'];
    insSyntax['addl'] = ['rA', 'rB'];
    insSyntax['subl'] = ['rA', 'rB'];
    insSyntax['xorl'] = ['rA', 'rB'];
    insSyntax['andl'] = ['rA', 'rB'];
    insSyntax['jmp'] = ['Dest'];
    insSyntax['jle'] = ['Dest'];
    insSyntax['jl'] = ['Dest'];
    insSyntax['je'] = ['Dest'];
    insSyntax['jne'] = ['Dest'];
    insSyntax['jge'] = ['Dest'];
    insSyntax['jg'] = ['Dest'];
    insSyntax['call'] = ['Dest'];
    insSyntax['ret'] = [];
    insSyntax['pushl'] = ['rA'];
    insSyntax['popl'] = ['rA'];
    insSyntax['iaddl'] = ['V', 'rB'];

    window.regName = ['%eax', '%ecx', '%edx', '%ebx', '%esp', '%ebp', '%esi', '%edi'];

    window.YSSyntaxError = function (lineNum, msg) {
        this.msg = 'Syntax error at Line ' + (lineNum + 1) + ' :' + msg;
    };

    window.YSSyntaxError.prototype.toString = function() {
        return this.msg;
    };

    // 填充为 8 位 16 进制
    var pad = function(n) {
        if (n.length == 8) return n;
        else return padHex(n, 8);
    };

    // 用于编码单条指令
    var insEncoder = [];
    
    insEncoder[0] = function() {
        return '00';
    };

    insEncoder[1] = function() {
        return '10';
    };

    insEncoder[2] = function() {
        return '20' + this.rA + this.rB;
    };

    insEncoder[3] = function() {
        return '308' + this.rB + pad(this.V);
    };

    insEncoder[4] = function() {
        return '40' + this.rA + this.rB + pad(this.D);
    };

    insEncoder[5] = function() {
        return '50' + this.rA + this.rB + pad(this.D);
    };

    insEncoder[6] = function() {
        return '6' + this.fn + this.rA + this.rB;
    };

    insEncoder[7] = function() {
        return '7' + this.fn + pad(this.Dest);
    };

    insEncoder[8] = function() {
        return '80' + pad(this.Dest);
    };

    insEncoder[9] = function() {
        return '90';
    };

    insEncoder[10] = function() {
        return 'a0' + this.rA + '8';
    };

    insEncoder[11] = function() {
        return 'b0' + this.rA + '8';
    };

    insEncoder[12] = function() {
        return 'c08' + this.rB + pad(this.V);
    };

    var getRegCode = function(name) {
        var code = regName.indexOf(name);
        if (code == -1) {
            $('#status').text('Assemble failed: Not a register: "' + name + '"');
            throw new Error('Not a register: "' + name + '"');
        }
        else
            return code.toString(16);
    };

    // 对指令的参数进行编码
    var encodeArgs = function(list, args, symbols) {
        //console.log(list, args, symbols);
        var result = {};

        for (var i in list) {
            var item = list[i];
            if (item == 'rA') {
                result['rA'] = getRegCode(args[i]);
            }
            else if (item == 'rB') {
                result['rB'] = getRegCode(args[i]);
            }
            else if (item == 'V' || item == 'D') {
                if (symbols.hasOwnProperty(args[i])) {
                    result['V'] = toLittleEndian(padHex(symbols[args[i]], 8));
                    result['D'] = result['V'];
                }
                else {
                    try {
                        result['V'] = toLittleEndian(padHex(parseNumber(args[i].replace('$', '')), 8));
                    }
                    catch (e) {
                        $('#status').text('Assemble failed: Undefined symbol: ' + args[i]);
                        throw new Error('Undefined symbol: ' + args[i]);
                    }
                    result['D'] = result['V'];
                }
            }
            else if (item == 'Dest') {
                try {
                    result['Dest'] = toLittleEndian(padHex(symbols[args[i]], 8));
                }
                catch (e) {
                    $('#status').text('Assemble failed: Undefined symbol: ' + args[i]);
                    throw new Error('Undefined symbol: ' + args[i]);
                }
            }
            else if (item == 'D(rB)') {
                result['D'] = toLittleEndian(padHex(parseNumber(args[i].replace(/\(.*/, '')) >>> 0, 8));
                result['rB'] = getRegCode(args[i].replace(/^.*\((.*)\)/, '$1'));
            }
        }

        return result;
    };

    // 对单条指令进行编码
    window.Encode = function(ins, symbols, lineNum) {
        //console.log('Processing instruction:' + ins);

        var result = '';
        var args = [];
        var vars = {};

        // 提取参数
        ins = ins.replace(/\s*,\s*/i, ',');
        args = ins.split(' ');
        ins = args.splice(0, 1)[0];
        args = args[0] ? args[0].split(',') : new Array();
        vars = encodeArgs(insSyntax[ins], args, symbols);

        var icode = insToicode[ins];
        if (insToifun.hasOwnProperty(ins)) {
            vars['fn'] = insToifun[ins];
        }
        if (icode in insEncoder) {
            result = insEncoder[icode].call(vars);
        }
        else {
            // 非法指令
            $('#status').text('Assemble failed at line ' + (lineNum + 1) + ': Invalid instruction "' + ins + '"');
            throw new YSSyntaxError(lineNum, 'Invalid instruction "' + ins + '"');
        }
        return result;
    };

    window.YSLoaded = false;

    // Y86 Assembler
    window.YSLoader = function(data, filename, needPreRun) {
        console.log('YSLoader triggered.');

        if (typeof needPreRun == 'undefined') needPreRun = false;

        window.YSData = data;
        window.YOData = '';
        window.YSName = filename;

        // 去除备注和多余空格
        var lines = data.split('\n');
        for (var i = 0; i < lines.length; ++ i) {
            lines[i] = lines[i].replace(/#.*/gi, '');
            lines[i] = lines[i].replace(/\/\*.*\*\//gi, '');
            lines[i] = lines[i].replace(/^\s+/gi, '');
            lines[i] = lines[i].replace(/\s+$/gi, '');
            lines[i] = lines[i].replace(/\s+/gi, ' ');
        }

        if (lines[lines.length - 1].trim() != '') {
            $('#status').text('Assemble failed: Last line must be empty');
            throw new YSSyntaxError([lines.length - 1, 'Last line must be empty.']);
        }

        var result = new Array(lines.length);
        var symbols = {};
        var counter = 0;
        var line, symbol, directive, ins;

        // 创建 symbol table 并记录内存地址
        for (var i = 0; i < lines.length; ++ i) {
            line = lines[i];
            result[i] = ['', '', line];

            if (line == '') continue;

            result[i][0] = [toHexString(counter, 4)];

            // 添加 symbol
            symbol = line.match(/(^.*?):/i);
            if (symbol) {
                symbols[symbol[1]] = counter;
                lines[i] = line = line.replace(/^.*?:\s*/i, '');
            }

            // 处理 directives
            directive = line.match(/(^\..*?) (.*)/i);
            if (directive) {
                if (directive[1] == '.pos') {
                    try {
                        counter = parseNumber(directive[2]);
                    }
                    catch (e) {
                        $('#status').text('Assemble failed at line ' + (i + 1) + ': ' + e.message);
                        throw new YSSyntaxError(i, e.message);
                    }
                }
                else if (directive[1] == '.align') {
                    try {
                        var nAlign = parseNumber(directive[2]);
                    }
                    catch (e) {
                        $('#status').text('Assemble failed at line ' + (i + 1) + ': ' + e.message);
                        throw new YSSyntaxError(i, e.message);
                    }
                    // 根据 align 修正偏移量
                    counter = Math.ceil(counter / nAlign) * nAlign;
                }
                else if (directive[1] == '.long') {
                    counter += 4;
                }
                else {
                    $('#status').text('Assemble failed: Unknown directive: ' + directive[1]);
                    throw new YSSyntaxError(i, 'Unknown directive: ' + directive[1]);
                }
            }

            // 计算指令长度偏移量
            ins = line.match(/(^[a-z]+)/i);
            if (ins) {
                var icode = insToicode[ins[1]];
                counter += insLength[icode];
            }
        }

        // 汇编, 处理 .long
        for (var i = 0; i < lines.length; ++ i) {
            line = lines[i];
            if (line.trim() == '') continue;

            directive = line.match(/^\.long (.*)/i);

            if (directive) {
                var val;
                try {
                    val = parseNumber(directive[1]);
                }
                catch (e) {
                    if (symbols.hasOwnProperty(directive[1]))
                        val = symbols[directive[1]];
                    else {
                        $('#status').text('Assemble failed: Error while parsing .long directive: undefined symbol ' + directive[1]);
                        throw new YSSyntaxError(i, 'Error while parsing .long directive: undefined symbol ' + directive[1]);
                    }
                }
                result[i][1] = toLittleEndian(padHex(val, 8));
                counter += 4;
                continue;
            }

            if (line[0] == '.') continue;

            ins = line.match(/^([a-z]+)(.*)/i);
            if (ins) {
                try {
                    result[i][1] = Encode(line, symbols, i);
                }
                catch (e) {
                    $('#status').text('Assemble failed at line ' + (i + 1) + ': ' + e.message);
                    throw new YSSyntaxError(i, e.message);
                }
            }
        }

        for (var i = 0; i < result.length; ++ i) {
            line = result[i];
            var part = '  ';
            if (line[0].length)
                part += line[0] + ': ' + line[1];
            // 填充到 24 个字符
            var pad = new Array(24 - part.length).join(' ');
            result[i] = part + pad + '| ' + line[2];
        }

        window.YSLoaded = true;
        // 渲染代码窗口并添加保存按钮
        renderCode(YSData);
        $('#code_box_title p').append($('<button id="code_box_save_yo"><i class="glyphicon glyphicon-floppy-disk"></i> Save .yo file</button>'))

        // 汇编结束, 调用 YOLoader 载入汇编得到的 YO 文件
        YOLoader(result.join('\n'), YSName.replace('.ys', '.yo'), true, needPreRun);
    }

})();