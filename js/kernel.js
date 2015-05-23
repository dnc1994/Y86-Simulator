/*
 * File: kernel.js
 * Author: Zhang Linghao <zlhdnc1994gmail.com>
 */

(function() {
    window.VM = {
        M : new Memory(),
        R : new Registers()
    };

    var ALU = function() {
        var inputA = 0, inputB = 0, Fcode = 0, needUpCC = 0;
        var tVal = 0;
        var CC = 4; // ZF = 1

        // 第0位表示OF, 第1位表示SF, 第2位表示ZF
        // 注意先将对应的位置为0
        var setZF = function(flag) {
            CC = (CC & 3) | ((!!flag) << 2);
        };

        var setSF = function(flag) {
            CC = (CC & 5) | ((!!flag) << 1);
        };

        var setOF = function(flag) {
            CC = (CC & 6) | ((!!flag) << 0);
        };

        var getZF = function() {
            return !!(CC & 4);
        };

        var getSF = function() {
            return !!(CC & 2);
        };

        var getOF = function() {
            return !!(CC & 1);
        };

        var Calc = {};

        Calc[CONST.A_ADD] = function() {
            tVal = inputA + inputB;
            if (needUpCC) updateCC();
        };

        Calc[CONST.A_SUB] = function() {
            tVal = inputB - inputA;
            if (needUpCC) updateCC();
        };

        Calc[CONST.A_AND] = function() {
            tVal = inputA & inputB;
            if (needUpCC) updateCC();
        };

        Calc[CONST.A_XOR] = function() {
            tval = inputA ^ inputB;
            if (needUpCC) updateCC();
        };

        var updateOF = {};

        updateOF[CONST.A_ADD] = function() {
            var a = toSigned(inputA), b = toSigned(inputB), t = toSigned(tVal);
            setOF(((a < 0) == (b < 0)) && ((t < 0) != (a < 0)));
        };

        updateOF[CONST.A_SUB] = function() {
            var a = toSigned(inputA), b = toSigned(inputB), t = toSigned(tVal);
            setOF(((a < 0) == (b > 0)) && ((t < 0) != (b < 0)));
        };

        updateOF[CONST.A_AND] = function() {
            setOF(false);
        };

        updateOF[CONST.A_XOR] = function() {
            setOF(false);
        };

        var Cond = {};

        Cond[CONST.C_TRUE] = function() {
            return true;
        };

        Cond[CONST.C_E] = function() {
            return getZF();
        };

        Cond[CONST.C_NE] = function() {
            return !getZF();
        };

        Cond[CONST.C_G] = function() {
            return !((getSF() ^ getOF()) | getZF());
        };

        Cond[CONST.C_GE] = function() {
            return !(getSF() ^ getOF());
        };

        Cond[CONST.C_L] = function() {
            return getSF() ^ getOF();
        };

        Cond[CONST.C_LE] = function() {
            return (getSF() ^ getOF() | getZF());
        };

        this.setInputA = function (val) {
            assert(isInt(val));
            inputA = val;
        };

        this.setInputB = function (val) {
            assert(isInt(val));
            inputB = val;
        };

        this.setFcode = function(code) {
            assert(isInt(code) && code >= 0 && code < 4);
            Fcode = code;
        };

        this.setNeedUpCC = function(flag) {
            needUpCC = !!flag;
        };

        var updateCC = function() {
            setZF(!tVal);
            setSF(!!(tVal >>> 31));
            if (updateOF[Fcode]) updateOF[Fcode]();
        };

        this.run = function() {
            if (Calc[Fcode]) Calc[Fcode]();
            return tVal;
        };

        this.getCnd = function(code) {
            try {
                assert(isInt(code) && code >= 0 && code < 7);
            } catch (e) {
                return true;
            }
            return Condition[code]();
        };
    };

    window.CPU = function() {
        var input = new window.TempRegisters();
        var output = new window.TempRegisters();
        var hlt_flg = false;
        var stat = CONST.S_AOK;

        var cycle = 0, instruction = 0;

        this.stat = function() {
            return stat;
        };

        this.cycle = function() {
            return cycle;
        };

        //var alu = new ALU();
        window.alu = new ALU();

        var fetch = function() {

            if(hlt_flg) return;

            nextPC = input.F_predPC;
            if(input.M_icode == CONST.I_JXX && !input.M_Cnd) {
                nextPC = input.M_valA;
            } else if(input.W_icode == CONST.I_RET) {
                nextPC = input.W_valM;
            }

            var byte0 = VM.Memory.readByte(nextPC ++); // Read is always OK.
            output.D_icode = byte0 >> 4;
            output.D_ifun = byte0 & 15;


            // 检查是否为合法指令
            if ([CONST.I_NOP, CONST.I_HALT, CONST.I_RRMOVL, CONST.I_IRMOVL,
                CONST.I_RMMOVL, CONST.I_MRMOVL, CONST.I_OPL, CONST.I_JXX,
                CONST.I_CALL, CONST.I_RET, CONST.I_PUSHL, CONST.I_POPL,
                CONST.I_LEAVE, CONST.I_IADDL ].indexOf(output.D_icode) == -1) {
                output.F_stat = output.D_stat = CONST.S_INS;
                return ;
            }

            if (output.D_icode == CONST.I_HALT) {
                output.F_stat = output.D_stat = CONST.S_HLT;
                return ;
            }
            output.F_stat = output.D_stat = CONST.S_AOK;
            if ([CONST.I_RRMOVL, CONST.I_OPL, CONST.I_IRMOVL, CONST.I_MRMOVL,
                CONST.I_RMMOVL, CONST.I_PUSHL, CONST.I_POPL, CONST.I_IADDL].indexOf(output.D_icode) != -1) {
                // Need Reg ID
                var regByte = VM.Memory.readByte(nextPC ++);
                output.D_rA = regByte >> 4; output.D_rB = regByte & 15;
            } else output.D_rA = output.D_rB = CONST.R_NONE;

            if ([CONST.I_IRMOVL, CONST.I_RMMOVL, CONST.I_MRMOVL,
                CONST.I_JXX, CONST.I_CALL, CONST.I_IADDL].indexOf(output.D_icode) != -1) {
                // Need valC
                output.D_valC = VM.Memory.readInt(nextPC);
                nextPC += 4;
            }

            output.F_predPC = nextPC;
            if([CONST.I_JXX, CONST.I_CALL].indexOf(output.D_icode) != -1) {
                output.F_predPC = output.D_valC;
            }
            output.D_valP = nextPC;
        };
    };

})();