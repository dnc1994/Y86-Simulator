/*
 * File: disassembler.js
 * Author: Zhang Linghao <zlhdnc1994@gmail.com>
 */

(function() {

    // 目标码对应的指令
    window.codeToIns = {
        '00' : 'nop',
        '10' : 'halt',
        '20' : 'rrmovl',
        '30' : 'irmovl',
        '40' : 'rmmovl',
        '50' : 'mrmovl',
        '60' : 'addl',
        '61' : 'subl',
        '62' : 'andl',
        '63' : 'xorl',
        '70' : 'jmp',
        '71' : 'jle',
        '72' : 'jl',
        '73' : 'je',
        '74' : 'jne',
        '75' : 'jge',
        '76' : 'jg',
        '80' : 'call',
        '90' : 'ret',
        'a0' : 'pushl',
        'b0' : 'popl',
        'c0' : 'iaddl'
    };

    window.YODumpError = function(lineNum, msg) {
        this.msg = 'Dump error at Line ' + (lineNum + 1) + msg;
    };

    window.YODumpError.prototype.toString = function () {
        return this.msg;
    };

    // 用于解码单条指令
    var insDecoder = [];

    insDecoder[0] = function() {
        return this.ins;
    };

    insDecoder[1] = function() {
        return this.ins;
    };

    insDecoder[2] = function() {
        return this.ins + ' ' + this.rA + ', ' + this.rB;
    };

    insDecoder[3] = function() {
        return this.ins + ' $0x' + padHex(this.V) + ', ' + this.rB;
    };

    insDecoder[4] = function() {
        return this.ins + ' ' + this.rA + ', ' + this.D + '(' + this.rB + ')';
    };

    insDecoder[5] = function() {
        return this.ins + ' ' + this.D + '(' + this.rB + '), ' + this.rA;
    };

    insDecoder[6] = function() {
        return this.ins + ' ' + this.rA + ', ' + this.rB;
    };

    // 注意这里不是一个地址而是一个 target 字符串
    insDecoder[7] = function() {
        return this.ins + ' ' + this.Dest;
    };

    insDecoder[8] = function() {
        return this.ins + ' ' + this.Dest;
    };

    insDecoder[9] = function() {
        return this.ins;
    };

    insDecoder[10] = function() {
        return this.ins + ' ' + this.rA;
    };

    insDecoder[11] = function() {
        return this.ins + ' ' + this.rA;
    };

    insDecoder[12] = function() {
        return this.ins + ' $0x' + padHex(this.V) + ', ' + this.rB;
    };

    // 目标码对应的语法
    window.codeSyntax = {};

    codeSyntax['halt'] = [];
    codeSyntax['nop'] = [];
    codeSyntax['rrmovl'] = ['rA', 'rB'];
    codeSyntax['irmovl'] = ['rA', 'rB', 'V'];
    codeSyntax['rmmovl'] = ['rA', 'rB', 'D'];
    codeSyntax['mrmovl'] = ['rA', 'rB', 'D'];
    codeSyntax['addl'] = ['rA', 'rB'];
    codeSyntax['subl'] = ['rA', 'rB'];
    codeSyntax['xorl'] = ['rA', 'rB'];
    codeSyntax['andl'] = ['rA', 'rB'];
    codeSyntax['jmp'] = ['Dest'];
    codeSyntax['jle'] = ['Dest'];
    codeSyntax['jl'] = ['Dest'];
    codeSyntax['je'] = ['Dest'];
    codeSyntax['jne'] = ['Dest'];
    codeSyntax['jge'] = ['Dest'];
    codeSyntax['jg'] = ['Dest'];
    codeSyntax['call'] = ['Dest'];
    codeSyntax['ret'] = [];
    codeSyntax['pushl'] = ['rA'];
    codeSyntax['popl'] = ['rA'];
    codeSyntax['iaddl'] = ['rA', 'rB', 'V'];

    var getRegName = function(code) {
        if (code < 0 || code > 7) throw new Error('No such register: ' + code);
    };

    // 对目标码的参数进行解码
    var decodeArgs = function(list, code) {
        if (code == '') return {};

        var result = {};
        var pos = 0, seg;

        for (var i in list) {
            var item = list[i];
            if (item == 'rA' || item == 'rB') {
                seg = code.slice(pos, pos + 1);
                result[item] = regName[seg];
                pos += 1;
            }
            else if (item == 'V' || item == 'D') {
                seg = code.slice(pos, pos + 8);
                var num = parseInt(toBigEndian(seg), 16);
                result[item] = (item == 'D' && !num ? '' : num);
                pos += 8;
            }
            else if (item == 'Dest') {
                seg = code.slice(pos, pos + 8);
                var num = parseInt(toBigEndian(seg), 16);
                // 处理 JXX / CALL
                var targetNo = Targets.indexOf(num);
                if (targetNo == -1) {
                    Targets.push(num);
                    result[item] = 'target' + (targetCount ++);
                }
                else
                    result[item] = 'target' + targetNo;
                pos += 8;
                console.log('Dest target', result[item], targetCount);
            }
            else
                throw new Error('No such syntax: ' + item);
        }

        return result;
    };

    // 对单行目标码进行解码
    window.Decode = function(code, lineNum) {
        var result = '';
        var ins = '';
        var vars = {};

        //console.log('processing code ' + code);

        // 目标码不属于指令, 可能是数据
        var insCode = code.slice(0, 2);
        if (codeToIns.hasOwnProperty(insCode)) {
            ins = codeToIns[insCode];
        }
        else {
            return [1, 'Invalid icode:ifun at line ' + (lineNum + 1) + ': ' + code];
        }

        // 目标码长度不匹配
        if (code.length != 2 * insLength[insToicode[ins]]) {
            return [1, 'Instruction length not matched at line ' + (lineNum + 1) + ':' + code];
        }

        vars = decodeArgs(codeSyntax[ins], code.slice(2));
        vars['ins'] = ins;

        //console.log(vars);

        result = insDecoder[insToicode[ins]].call(vars);

        return [0, result];
    };

    // Y86 Disassembler
    window.YODump = function(data) {
        console.log('YODump triggered.');

        window.DumpData = '';
        // 记录所有的 JXX/CALL target
        window.Targets = [];
        window.targetCount = 0;

        // 去除备注和多余空格, 记录每条指令的地址
        var lines = data.split('\n');
        var addrs = new Array(data.length);

        for (var i = 0; i < lines.length; ++ i) {
            lines[i] = lines[i].replace(/\|.*/gi, '');
            addrs[i] = parseInt(lines[i].replace(/:.*/gi, '').replace(/^\s+/gi, ''), 16);
            lines[i] = lines[i].replace(/.*:/gi, '');
            lines[i] = lines[i].replace(/^\s+/gi, '');
            lines[i] = lines[i].replace(/\s+$/gi, '');
        }

        var result = [];
        var errors = [];
        var line;

        for (var i = 0; i < lines.length; ++ i) {
            console.log('processing', lines[i]);

            line = lines[i];
            if (line == '') {
                result.push('');
                continue;
            }

            // 匹配target table
            var targetNo = Targets.indexOf(addrs[i]);
            //console.log('addr', addrs[i]);
            //console.log(Targets, targetNo);
            // 插入 target
            if (targetNo != -1) {
                result.push('target' + targetNo + ':');
            }

            var decodeResult = Decode(line, i);
            if (!decodeResult[0]) {
                result.push(decodeResult[1]);
            }
            // 解码错误
            else {
                result.push('');
                errors.push(decodeResult[1]);

            }
        }

        var results = result.join('\n');

        window.DumpData = results + (errors.length ? '' : '\n\n\nErrors(maybe due to data area) :\n' + errors.join('\n'));
    };

})();
