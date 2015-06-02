/*
 * File: disassembler.js
 * Author: Zhang Linghao <zlhdnc1994@gmail.com>
 */

(function() {

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

    insDecoder[7] = function() {
        return this.ins + ' $0x' + padHex(this.Dest);
    };

    insDecoder[8] = function() {
        return this.ins + ' $0x' + padHex(this.Dest);
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

    var decodeArgs = function(list, code) {
        if (code == '') return {};

        console.log(list, code);

        var result = {};
        var pos = 0, seg;

        for (var i in list) {
            var item = list[i];
            if (item == 'rA' || item == 'rB') {
                seg = code.slice(pos, pos + 1);
                result[item] = regName[seg];
                pos += 1;
            }
            else if (item == 'V' || item == 'D' || item == 'Dest') {
                seg = code.slice(pos, pos + 8);
                var num = parseInt(toBigEndian(seg), 16);
                result[item] = (item == 'D' && !num ? '' : num);
                pos += 8;
            }
            else
                throw new Error('No such syntax: ' + item);
        }

        return result;
    };

    window.Decode = function(code, lineNum) {
        var result = '';
        var ins = '';
        var vars = {};

        console.log('processing code ' + code);

        var insCode = code.slice(0, 2);
        if (codeToIns.hasOwnProperty(insCode)) {
            ins = codeToIns[insCode];
        }
        else {
            return [1, 'Invalid icode:ifun at line ' + (lineNum + 1) + ': ' + code];
        }

        if (code.length != 2 * insLength[insToicode[ins]]) {
            return [1, 'Instruction length not matched at line ' + (lineNum + 1) + ':' + code];
        }

        vars = decodeArgs(codeSyntax[ins], code.slice(2));
        vars['ins'] = ins;

        console.log(vars);

        result = insDecoder[insToicode[ins]].call(vars);

        return [0, result];
    };

    window.YODump = function(data) {
        console.log('YODump triggered.');

        window.DumpData = '';

        // 去除备注, 指令地址和多余空格
        var lines = data.split('\n');
        for (var i = 0; i < lines.length; ++ i) {
            lines[i] = lines[i].replace(/\|.*/gi, '');
            lines[i] = lines[i].replace(/.*:/gi, '');
            lines[i] = lines[i].replace(/^\s+/gi, '');
            lines[i] = lines[i].replace(/\s+$/gi, '');
        }

        var result = new Array(lines.length);
        var errors = [];
        var line;

        for (var i = 0; i < lines.length; ++ i) {
            line = lines[i];
            if (line == '') {
                result[i] = '';
                continue;
            }

            var decodeResult = Decode(line, i);
            console.log(decodeResult);
            if (!decodeResult[0]) {
                result[i] = decodeResult[1];
            }
            else {
                result[i] = '';
                errors.push(decodeResult[1]);

            }
        }

        var results = result.join('\n');

        console.log(results);

        window.DumpData = results;
        if (errors.length) DumpData += '\n\n\nErrors(maybe due to data area) :\n' + errors.join('\n');

    };

})();