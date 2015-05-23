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

        // 第 0 位表示 OF, 第 1 位表示 SF, 第 2 位表示 ZF
        // 注意先将对应的位置为 0
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

        Cond[CONST.C_LE] = function() {
            return (getSF() ^ getOF() | getZF());
        };

        Cond[CONST.C_L] = function() {
            return getSF() ^ getOF();
        };

        Cond[CONST.C_E] = function() {
            return getZF();
        };

        Cond[CONST.C_NE] = function() {
            return !getZF();
        };

        Cond[CONST.C_GE] = function() {
            return !(getSF() ^ getOF());
        };

        Cond[CONST.C_G] = function() {
            return !((getSF() ^ getOF()) | getZF());
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
            }
            catch (e) {
                return true;
            }
            console.log(getZF());
            console.log(getSF());
            console.log(getOF());
            console.log(code);
            console.log(Cond[code]());
            return Cond[code]();
        };
    };

    window.CPU = function() {
        var input = new window.PipelineRegisters();
        var output = new window.PipelineRegisters();
        var hlt_flg = false;
        var stat = CONST.S_AOK;

        var cycle = 0, instruction = 0;

        this.stat = function () {
            return stat;
        };

        this.cycle = function () {
            return cycle;
        };

        window.alu = new ALU();

        var fetch = function () {
            if (hlt_flg) return;

            nextPC = input.F_predPC;
            if (input.M_icode == CONST.I_JXX && !input.M_Cnd)
                nextPC = input.M_valA;
            else if (input.W_icode == CONST.I_RET)
                nextPC = input.W_valM;

            // 抽取 icode, ifun
            var byte0 = VM.M.readByte(nextPC++);
            output.D_icode = byte0 >> 4;
            output.D_ifun = byte0 & 15;


            // 检查是否为非法指令
            if ([CONST.I_NOP, CONST.I_HALT, CONST.I_RRMOVL, CONST.I_IRMOVL, CONST.I_RMMOVL,
                CONST.I_MRMOVL, CONST.I_OPL, CONST.I_JXX, CONST.I_CALL, CONST.I_RET,
                CONST.I_PUSHL, CONST.I_POPL].indexOf(output.D_icode) == -1) {
                output.F_stat = output.D_stat = CONST.S_INS;
                return;
            }

            // 检查是否遇到 halt 指令
            if (output.D_icode == CONST.I_HALT) {
                output.F_stat = output.D_stat = CONST.S_HLT;
                return;
            }

            // 正常状态
            output.F_stat = output.D_stat = CONST.S_AOK;

            // 抽取 rA, rB
            if ([CONST.I_RRMOVL, CONST.I_OPL, CONST.I_IRMOVL, CONST.I_MRMOVL,
                CONST.I_RMMOVL, CONST.I_PUSHL, CONST.I_POPL].indexOf(output.D_icode) != -1) {
                var regByte = VM.M.readByte(nextPC++);
                output.D_rA = regByte >> 4;
                output.D_rB = regByte & 0xF;
            }
            else
                output.D_rA = output.D_rB = CONST.R_NONE;

            // 抽取 valC
            if ([CONST.I_IRMOVL, CONST.I_RMMOVL, CONST.I_MRMOVL,
                CONST.I_JXX, CONST.I_CALL].indexOf(output.D_icode) != -1) {
                output.D_valC = VM.M.readInt(nextPC);
                nextPC += 4;
            }

            // 计算 valP
            output.F_predPC = nextPC;
            if ([CONST.I_JXX, CONST.I_CALL].indexOf(output.D_icode) != -1) {
                output.F_predPC = output.D_valC;
            }
            output.D_valP = nextPC;
        };

        var decode = function () {
            output.E_icode = input.D_icode;
            output.E_ifun = input.D_ifun;
            output.E_valC = input.D_valC;
            output.E_stat = input.D_stat;

            //  output.E_srcA
            if ([CONST.I_RRMOVL, CONST.I_RMMOVL, CONST.I_OPL, CONST.I_PUSHL].indexOf(input.D_icode) != -1)
                output.E_srcA = input.D_rA;
            else if ([CONST.I_POPL, CONST.I_RET].indexOf(input.D_icode) != -1)
                output.E_srcA = CONST.R_ESP;
            else output.E_srcA = CONST.R_NONE;

            // output.E_srcB
            if ([CONST.I_OPL, CONST.I_RMMOVL, CONST.I_MRMOVL].indexOf(input.D_icode) != -1)
                output.E_srcB = input.D_rB;
            else if ([CONST.I_PUSHL, CONST.I_POPL, CONST.I_CALL, CONST.I_RET].indexOf(input.D_icode) != -1)
                output.E_srcB = CONST.R_ESP;
            else output.E_srcB = CONST.R_NONE;

            // output.E_dstE
            if ([CONST.I_RRMOVL, CONST.I_IRMOVL, CONST.I_OPL].indexOf(input.D_icode) != -1)
                output.E_dstE = input.D_rB;
            else if ([CONST.I_PUSHL, CONST.I_POPL, CONST.I_CALL, CONST.I_RET].indexOf(input.D_icode) != -1)
                output.E_dstE = CONST.R_ESP;
            else output.E_dstE = CONST.R_NONE;

            // output.E_dstM
            if ([CONST.I_MRMOVL, CONST.I_POPL].indexOf(input.D_icode) != -1)
                output.E_dstM = input.D_rA;
            else output.E_dstM = CONST.R_NONE;

            // output.E_valA
            if ([CONST.I_CALL, CONST.I_JXX].indexOf(input.D_icode) != -1)
                output.E_valA = input.D_valP;
            else if (output.E_srcA == output.M_dstE)
                output.E_valA = output.M_valE;
            else if (output.E_srcA == input.M_dstM)
                output.E_valA = output.W_valM;
            else if (output.E_srcA == input.M_dstE)
                output.E_valA = input.M_valE;
            else if (output.E_srcA == input.W_dstM)
                output.E_valA = input.W_valM;
            else if (output.E_srcA == input.W_dstE)
                output.E_valA = input.W_valE;
            else output.E_valA = VM.R.get(output.E_srcA);

            // output.E_valB
            if (output.E_srcB == output.M_dstE)
                output.E_valB = output.M_valE;
            else if (output.E_srcB == input.M_dstM)
                output.E_valB = output.W_valM;
            else if (output.E_srcB == input.M_dstE)
                output.E_valB = input.M_valE;
            else if (output.E_srcB == input.W_dstM)
                output.E_valB = input.W_valM;
            else if (output.E_srcB == input.W_dstE)
                output.E_valB = input.W_valE;
            else output.E_valB = VM.R.get(output.E_srcB);
        };

        var execute = function () {
            output.M_icode = input.E_icode;
            output.M_valA = input.E_valA;
            output.M_dstM = input.E_dstM;
            output.M_stat = input.E_stat;

            // alu.inputA
            if (input.E_icode == CONST.I_HALT && input.E_stat != CONST.S_BUB) {
                hlt_flg = true;
                output.M_stat = CONST.S_HLT;
            }
            if ([CONST.I_RRMOVL, CONST.I_OPL].indexOf(input.E_icode) != -1)
                alu.setInputA(input.E_valA);
            else if ([CONST.I_IRMOVL, CONST.I_RMMOVL, CONST.I_MRMOVL].indexOf(input.E_icode) != -1)
                alu.setInputA(input.E_valC);
            else if ([CONST.I_CALL, CONST.I_PUSHL].indexOf(input.E_icode) != -1)
                alu.setInputA(-4);
            else if ([CONST.I_RET, CONST.I_POPL].indexOf(input.E_icode) != -1)
                alu.setInputA(4);
            else alu.setInputA(0);

            // alu.inputB
            if ([CONST.I_RMMOVL, CONST.I_MRMOVL, CONST.I_OPL, CONST.I_CALL,
                CONST.I_PUSHL, CONST.I_RET, CONST.I_POPL, CONST.I_IADDL].indexOf(input.E_icode) != -1)
                alu.setInputB(input.E_valB);
            else alu.setInputB(0);

            // alu.Fcode
            if (input.E_icode == CONST.I_OPL)
                alu.setFcode(input.E_ifun);
            else alu.setFcode(0);

            // alu.setCC
            if ([CONST.I_OPL, CONST.I_IADDL].indexOf(input.E_icode) != -1
                && [CONST.S_ADR, CONST.S_INS, CONST.S_HLT].indexOf(output.W_stat) == -1
                && [CONST.S_ADR, CONST.S_INS, CONST.S_HLT].indexOf(input.W_stat) == -1)
                alu.setNeedUpCC(true);
            else
                alu.setNeedUpCC(false);

            output.M_valE = alu.run();
            output.M_Cnd = alu.getCnd(input.E_ifun);
            output.M_valA = input.E_valA;
            if (input.E_icode == CONST.I_RRMOVL && !output.M_Cnd)
                output.M_dstE = CONST.R_NONE;
            else output.M_dstE = input.E_dstE;
        };

        var memory = function () {
            var memRead = false, memWrite = false, memAddr = toSigned(0);

            output.W_stat = input.M_stat;
            output.W_icode = input.M_icode;
            output.W_valE = input.M_valE;
            output.W_dstE = input.M_dstE;
            output.W_dstM = input.M_dstM;

            // 获取内存地址
            if ([CONST.I_RMMOVL, CONST.I_PUSHL, CONST.I_CALL, CONST.I_MRMOVL].indexOf(input.M_icode) != -1)
                memAddr = input.M_valE;
            else if ([CONST.I_POPL, CONST.I_RET].indexOf(input.M_icode) != -1)
                memAddr = input.M_valA;

            // 判断是否读写内存
            memRead = [CONST.I_MRMOVL, CONST.I_POPL, CONST.I_RET].indexOf(input.M_icode) != -1;
            memWrite = [CONST.I_RMMOVL, CONST.I_PUSHL, CONST.I_CALL].indexOf(input.M_icode) != -1;

            // output.W_valM
            if (memRead) output.W_valM = VM.M.readInt(memAddr);
            if (memWrite)
                try {
                    VM.M.writeInt(memAddr, input.M_valA);
                }
                catch (e) {
                    // 非法内存地址
                    output.W_stat = CONST.S_ADR;
                }
        };

        var write_back = function () {
            stat = input.W_stat;
            if (input.W_icode == CONST.I_RMMOVL) return;
            VM.R.set(input.W_dstE, input.W_valE);
            VM.R.set(input.W_dstM, input.W_valM);
        };

        // 流水线控制逻辑的实现
        var pipeline_logic = function() {
            var F_stall = (([CONST.I_MRMOVL, CONST.I_POPL].indexOf(input.E_icode) != -1)
                && ([output.E_srcA, output.E_srcB].indexOf(input.E_dstM) != -1))
                || ([input.D_icode, input.E_icode, input.M_icode].indexOf(CONST.I_RET) != -1);

            var D_stall = ([CONST.I_MRMOVL, CONST.I_POPL].indexOf(input.E_icode) != -1)
                && ([output.E_srcA, output.E_srcB].indexOf(input.E_dstM) != -1);

            var D_bubble = (input.E_icode == CONST.I_JXX && !output.M_Cnd)
                || ((!D_stall) && ([input.D_icode, input.E_icode, input.M_icode].indexOf(CONST.I_RET) != -1));

            var E_bubble = (input.E_icode == CONST.I_JXX && !output.M_Cnd)
                || (([CONST.I_MRMOVL, CONST.I_POPL, CONST.I_LEAVE].indexOf(input.E_icode) != -1
                && [output.E_srcA, output.E_srcB].indexOf(input.E_dstM) != -1));

            var M_bubble = [CONST.S_ADR, CONST.S_INS, CONST.S_HLT].indexOf(output.W_stat) != -1
                || [CONST.S_ADR, CONST.S_INS, CONST.S_HLT].indexOf(input.W_stat) != -1;

            // Then write Regs from input to output.

            var tmpIn = new PipelineRegisters(output);

            // Memory bubble
            if(M_bubble) {
                tmpIn.M_icode = CONST.I_NOP;
                tmpIn.M_stat = CONST.S_BUB;
                tmpIn.M_dstE = tmpIn.M_dstM = CONST.R_NONE;
                tmpIn.M_Cnd = false;
            }

            // Execute bubble
            if(E_bubble) {
                tmpIn.E_icode = CONST.I_NOP; tmpIn.E_ifun = 0;
                tmpIn.E_stat = CONST.S_BUB;
                tmpIn.E_dstE = tmpIn.E_dstM = tmpIn.E_srcA = tmpIn.E_srcB = CONST.R_NONE;
            }

            // Decode stall
            if(D_stall) {
                tmpIn.D_icode = input.D_icode;
                tmpIn.D_ifun = input.D_ifun;
                tmpIn.D_rA = input.D_rA;
                tmpIn.D_rB = input.D_rB;
                tmpIn.D_valC = input.D_valC;
                tmpIn.D_valP = input.D_valP;
            }

            // Decode bubble
            if(D_bubble) {
                tmpIn.D_icode = CONST.I_NOP; tmpIn.D_ifun = 0;
                tmpIn.D_stat = CONST.S_BUB;
            }

            // Fetch stall
            if(F_stall) {
                tmpIn.F_predPC = input.F_predPC;
            }

            input = tmpIn;
        };

        this.notify = function() { // Generate a clock tick.
            if (input.W_icode == CONST.I_HALT) stat = CONST.STAT_HLT;
            if (stat != CONST.S_AOK && stat != CONST.S_BUB) throw stat;
            // Temp Regs now write value into the target.

            write_back();
            memory();
            execute();
            decode();
            fetch();
            ++ cycle;
            if(stat != CONST.S_BUB) ++ instruction;

            pipeline_logic();
        };

        this.getInput = function() {
            return input;
        };

        this.instruction = function() {
            return instruction;
        }
    }
})();
