/*
 * File: kernel.js
 * Author: Zhang Linghao <zlhdnc1994@gmail.com>
 */

(function() {

    window.VM = {
        M : new Memory(),
        R : new Registers(),
        C : new Cache()
    };

    var ALU = function() {
        var inputA = 0, inputB = 0, Fcode = 0, needUpCC = 0;
        var tVal = 0;
        var CC = 4; // ZF = 1

        // 第 0 位表示 OF, 第 1 位表示 SF, 第 2 位表示 ZF
        // 注意先将对应的位置为 0
        var setZF = function(flag) {
            //console.log('setting ZF', flag);
            CC = (CC & 3) | ((!!flag) << 2);
            //console.log('ZF set', getZF());
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

        this.getZF = getZF;
        this.getSF = getSF;
        this.getOF = getOF;

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
            tVal = inputA ^ inputB;
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
            return Cond[code]();
        };
    };

    window.CPU = function() {
        // input 表示当前周期始的流水线寄存器状态
        // output 表示当前周期末的流水线寄存器状态
        var input = new window.PipelineRegisters();
        var output = new window.PipelineRegisters();
        var hlt_flag = false, stat = CONST.S_AOK;

        // 统计指令的出现频率用于计算CPI和进行性能分析
        var cycle = 0, instruction = 0;
        var count_mrmovl = 0, count_popl = 0, count_load_use = 0;
        var count_cond_branch = 0, count_mispredict = 0;
        var count_ret = 0;
        // 记录CPI用于绘图
        window.CPIcycles = [0];
        window.CPIvalues = ['1.000'];
        window.CacheStat = [0, 0];

        window.alu = new ALU();

        var fetch = function () {
            if (hlt_flag) return;

            var nextPC = input.F_predPC;
            if (input.M_icode == CONST.I_JXX && !input.M_Bch)
                nextPC = input.M_valA;
            else if (input.W_icode == CONST.I_RET)
                nextPC = input.W_valM;

            // 抽取 icode, ifun
            var byte0 = VM.M.readByte(nextPC ++);
            output.D_icode = byte0 >> 4;
            output.D_ifun = byte0 & 15;

            // 检查是否为非法指令
            if ([CONST.I_NOP, CONST.I_HALT, CONST.I_RRMOVL, CONST.I_IRMOVL, CONST.I_RMMOVL,
                CONST.I_MRMOVL, CONST.I_OPL, CONST.I_JXX, CONST.I_CALL, CONST.I_RET,
                CONST.I_PUSHL, CONST.I_POPL, CONST.I_IADDL].indexOf(output.D_icode) == -1) {
                output.F_stat = output.D_stat = CONST.S_INS;
                return;
            }

            // 检查是否遇到 halt 指令
            if (output.D_icode == CONST.I_HALT) {
                output.F_stat = output.D_stat = CONST.S_HLT;
                return;
            }

            // 正常
            output.F_stat = output.D_stat = CONST.S_AOK;

            // 抽取 rA, rB
            if ([CONST.I_RRMOVL, CONST.I_OPL, CONST.I_IRMOVL, CONST.I_MRMOVL,
                CONST.I_RMMOVL, CONST.I_PUSHL, CONST.I_POPL, CONST.I_IADDL].indexOf(output.D_icode) != -1) {
                var regByte = VM.M.readByte(nextPC ++);
                output.D_rA = regByte >> 4;
                output.D_rB = regByte & 0xF;
            }
            else
                output.D_rA = output.D_rB = CONST.R_NONE;

            // 抽取 valC
            if ([CONST.I_IRMOVL, CONST.I_RMMOVL, CONST.I_MRMOVL,
                CONST.I_JXX, CONST.I_CALL, CONST.I_IADDL].indexOf(output.D_icode) != -1) {
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
            else
                output.E_srcA = CONST.R_NONE;

            // output.E_srcB
            if ([CONST.I_OPL, CONST.I_RMMOVL, CONST.I_MRMOVL, CONST.I_IADDL].indexOf(input.D_icode) != -1)
                output.E_srcB = input.D_rB;
            else if ([CONST.I_PUSHL, CONST.I_POPL, CONST.I_CALL, CONST.I_RET].indexOf(input.D_icode) != -1)
                output.E_srcB = CONST.R_ESP;
            else
                output.E_srcB = CONST.R_NONE;

            // output.E_dstE
            if ([CONST.I_RRMOVL, CONST.I_IRMOVL, CONST.I_OPL, CONST.I_IADDL].indexOf(input.D_icode) != -1)
                output.E_dstE = input.D_rB;
            else if ([CONST.I_PUSHL, CONST.I_POPL, CONST.I_CALL, CONST.I_RET].indexOf(input.D_icode) != -1)
                output.E_dstE = CONST.R_ESP;
            else
                output.E_dstE = CONST.R_NONE;

            // output.E_dstM
            if ([CONST.I_MRMOVL, CONST.I_POPL].indexOf(input.D_icode) != -1)
                output.E_dstM = input.D_rA;
            else
                output.E_dstM = CONST.R_NONE;

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
            else
                output.E_valA = VM.R.get(output.E_srcA);

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
            else
                output.E_valB = VM.R.get(output.E_srcB);
        };

        var execute = function () {
            output.M_icode = input.E_icode;
            output.M_valA = input.E_valA;
            output.M_dstM = input.E_dstM;
            output.M_stat = input.E_stat;

            if (input.E_icode == CONST.I_MRMOVL) ++ count_mrmovl;
            if (input.E_icode == CONST.I_POPL) ++ count_popl;
            if (input.E_icode == CONST.I_JXX) ++ count_cond_branch;
            if (input.E_icode == CONST.I_RET) ++ count_ret;

            // alu.inputA
            if (input.E_icode == CONST.I_HALT && input.E_stat != CONST.S_BUB) {
                hlt_flag = true;
                output.M_stat = CONST.S_HLT;
            }
            if ([CONST.I_RRMOVL, CONST.I_OPL].indexOf(input.E_icode) != -1)
                alu.setInputA(input.E_valA);
            else if ([CONST.I_IRMOVL, CONST.I_RMMOVL, CONST.I_MRMOVL, CONST.I_IADDL].indexOf(input.E_icode) != -1)
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
            // ??
            else
                alu.setFcode(0);

            // alu.setCC
            if ([CONST.I_OPL, CONST.I_IADDL].indexOf(input.E_icode) != -1
                && [CONST.S_ADR, CONST.S_INS, CONST.S_HLT].indexOf(output.W_stat) == -1
                && [CONST.S_ADR, CONST.S_INS, CONST.S_HLT].indexOf(input.W_stat) == -1)
                alu.setNeedUpCC(true);
            else
                alu.setNeedUpCC(false);

            output.M_valE = alu.run();
            //console.log('M_val calc by ALU: ' + Eoutput.M_valE);
            // E_icode != CONST.I_JXX 时 M_Bch 的值不影响流水线
            //output.M_Bch = input.E_icode != CONST.I_JXX ? 0 : alu.getCnd(input.E_ifun);
            output.M_Bch = alu.getCnd(input.E_ifun);
            output.M_valA = input.E_valA;
            if (input.E_icode == CONST.I_RRMOVL && !output.M_Bch)
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

            if (memRead) output.W_valM = VM.M.readInt(memAddr);
            //console.log('memAddr: ' + memAddr);
            if (memWrite)
                try {
                    VM.M.writeInt(memAddr, input.M_valA);
                }
                catch (e) {
                    // 内存地址非法
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
        var pipeline_control_logic = function() {
            var F_stall = (([CONST.I_MRMOVL, CONST.I_POPL].indexOf(input.E_icode) != -1)
                && ([output.E_srcA, output.E_srcB].indexOf(input.E_dstM) != -1))
                || ([input.D_icode, input.E_icode, input.M_icode].indexOf(CONST.I_RET) != -1);

            var D_stall = ([CONST.I_MRMOVL, CONST.I_POPL].indexOf(input.E_icode) != -1)
                && ([output.E_srcA, output.E_srcB].indexOf(input.E_dstM) != -1);

            var D_bubble = (input.E_icode == CONST.I_JXX && !output.M_Bch)
                || ((!D_stall) && ([input.D_icode, input.E_icode, input.M_icode].indexOf(CONST.I_RET) != -1));

            var E_bubble = (input.E_icode == CONST.I_JXX && !output.M_Bch)
                || (([CONST.I_MRMOVL, CONST.I_POPL].indexOf(input.E_icode) != -1
                    && [output.E_srcA, output.E_srcB].indexOf(input.E_dstM) != -1));

            var M_bubble = [CONST.S_ADR, CONST.S_INS, CONST.S_HLT].indexOf(output.W_stat) != -1
                || [CONST.S_ADR, CONST.S_INS, CONST.S_HLT].indexOf(input.W_stat) != -1;

            // 统计
            if (([CONST.I_MRMOVL, CONST.I_POPL].indexOf(input.E_icode) != -1) &&
                (input.E_dstM == input.E_srcA || input.E_dstM == input.E_srcB)) ++ count_load_use;

            if (input.E_icode == CONST.I_JXX && !input.M_Bch) {
                //console.log('mispredict ' + VM.CPU.getCycle());
                ++ count_mispredict;
            }

            var newInput = new PipelineRegisters(output);

            // Memory bubble
            if (M_bubble) {
                newInput.M_icode = CONST.I_NOP;
                newInput.M_stat = CONST.S_BUB;
                newInput.M_dstE = newInput.M_dstM = CONST.R_NONE;
                newInput.M_Bch = false;
            }

            // Execute bubble
            if (E_bubble) {
                newInput.E_icode = CONST.I_NOP; newInput.E_ifun = 0;
                newInput.E_stat = CONST.S_BUB;
                newInput.E_dstE = newInput.E_dstM = newInput.E_srcA = newInput.E_srcB = CONST.R_NONE;
            }

            // Decode stall
            if (D_stall) {
                newInput.D_icode = input.D_icode;
                newInput.D_ifun = input.D_ifun;
                newInput.D_rA = input.D_rA;
                newInput.D_rB = input.D_rB;
                newInput.D_valC = input.D_valC;
                newInput.D_valP = input.D_valP;
            }

            // Decode bubble
            if (D_bubble) {
                newInput.D_icode = CONST.I_NOP; newInput.D_ifun = 0;
                newInput.D_stat = CONST.S_BUB;
            }

            // Fetch stall
            if (F_stall) {
                newInput.F_predPC = input.F_predPC;
            }

            input = newInput;
        };

        // 产生一个时钟上升沿
        this.tick = function() {
            if (input.W_icode == CONST.I_HALT) stat = CONST.S_HLT;
            if (stat != CONST.S_AOK && stat != CONST.S_BUB) throw stat;

            write_back();
            memory();
            execute();
            decode();
            fetch();

            ++ cycle;
            if(stat != CONST.S_BUB) ++ instruction;

            pipeline_control_logic();
        };

        this.getStat = function () {
            return stat;
        };

        this.getCycle = function () {
            return cycle;
        };

        this.getInstruction = function() {
            return instruction;
        };

        this.getCPI = function(genTable) {
            if (typeof genTable == 'undefined') genTable = false;
            var ins_freq = {
                lp : !instruction ? 0: (count_mrmovl + count_popl) / instruction,
                mp : !instruction ? 0: count_cond_branch / instruction,
                rp : !instruction ? 0: count_ret / instruction
            };

            var cond_freq = {
                lp : !(count_mrmovl + count_popl) ? 0 : count_load_use / (count_mrmovl + count_popl),
                mp : !count_cond_branch ? 0 : count_mispredict / count_cond_branch,
                rp : 1
            };

            var lp = ins_freq["lp"] * cond_freq["lp"];
            var mp = ins_freq["mp"] * cond_freq["mp"] * 2;
            var rp = ins_freq["rp"] * cond_freq["rp"] * 3;

            /*
            console.log('Cycle ' + this.getCycle());
            console.log(ins_freq);
            console.log(cond_freq);
            console.log(1.0 + lp + mp + rp);
            */

            // 生成性能分析表格
            if (genTable)
                window.hazard_table = '<table class="tg"><tr><th class="tg-vc88">Cause</th><th class="tg-vc88">InsFreq</th><th class="tg-vc88">CondFreq</th><th class="tg-vc88">Bubble(s)</th><th class="tg-vc88">Product</th></tr><tr><td class="tg-vyw9">Load/Use</td><td class="tg-vyw9">' + ins_freq["lp"].toFixed(3) + '</td><td class="tg-vyw9">' + cond_freq["lp"].toFixed(3) + '</td><td class="tg-031e">1</td><td class="tg-vyw9">' + (ins_freq["lp"] * cond_freq["lp"]).toFixed(3) + '</td></tr><tr><td class="tg-vyw9">Mispredict</td><td class="tg-vyw9">' + ins_freq["mp"].toFixed(3) + '</td><td class="tg-vyw9">' + cond_freq["mp"].toFixed(3) + '</td><td class="tg-031e">2</td><td class="tg-vyw9">' + (ins_freq["mp"] * cond_freq["mp"] * 2).toFixed(3) + '</td></tr><tr><td class="tg-vyw9">Return</td><td class="tg-vyw9">' + ins_freq["rp"].toFixed(3) + '</td><td class="tg-vyw9">' + cond_freq["rp"].toFixed(3) + '</td><td class="tg-031e">3</td><td class="tg-vyw9">' + (ins_freq["rp"] * cond_freq["rp"] * 3).toFixed(3) + '</td></tr><tr><td class="tg-vyw9">Total Penalty</td><td class="tg-vyw9"></td><td class="tg-vyw9"></td><td class="tg-031e"></td><td class="tg-vyw9">' + (lp + mp + rp).toFixed(3) + '</td></tr></table>';
            return (1.0 + lp + mp + rp).toFixed(3);
        };

        this.getZF = function() {
            return alu.getZF();
        };

        this.getSF = function() {
            return alu.getSF();
        };

        this.getOF = function() {
            return alu.getOF();
        };

        this.getInput = function() {
            return input;
        };
    }

})();
