/*
 * File: registers.js
 * Author: Zhang Linghao <zlhdnc1994@gmail.com>
 */

(function() {

    // 流水线寄存器
    var pipeline_registers = function(val) {
        if (val === null || !(val instanceof Object)) {
            val = {};
        }

        // Fetch
        this.F_predPC = 0;

        // Decode
        this.D_icode = CONST.I_NOP;
        this.D_ifun = 0;
        this.D_rA = CONST.R_NONE;
        this.D_rB = CONST.R_NONE;
        this.D_valC = 0;
        this.D_valP = 0;
        this.D_stat = CONST.S_BUB;

        // Execute
        this.E_icode = CONST.I_NOP;
        this.E_ifun = 0;
        this.E_valC = 0;
        this.E_valA = 0;
        this.E_valB = 0;
        this.E_dstE = CONST.R_NONE;
        this.E_dstM = CONST.R_NONE;
        this.E_srcA = CONST.R_NONE;
        this.E_srcB = CONST.R_NONE;
        this.E_stat = CONST.S_BUB;

        // Memory
        this.M_icode = CONST.I_NOP;
        this.M_valE = 0;
        this.M_valA = 0;
        this.M_dstE = CONST.R_NONE;
        this.M_dstM = CONST.R_NONE;
        this.M_stat = CONST.S_BUB;
        this.M_Bch = false;

        // Write back
        this.W_icode = CONST.I_NOP;
        this.W_valE = 0;
        this.W_valM = 0;
        this.W_dstE = CONST.R_NONE;
        this.W_dstM = CONST.R_NONE;
        this.W_stat = CONST.S_BUB;

        // 复制构造方法
        for (entry in val) {
            if (typeof this[entry] != 'undefined') {
                this[entry] = val[entry];
            }
        }
    };

    // 寄存器
    var registers = function(val) {
        if(val === null || !(val instanceof Object)) {
            val = {};
        }

        this.R_EAX = 0;
        this.R_ECX = 0;
        this.R_EDX = 0;
        this.R_EBX = 0;
        this.R_ESP = 0;
        this.R_EBP = 0;
        this.R_ESI = 0;
        this.R_EDI = 0;

        // 复制构造方法
        for (entry in val) {
            if(typeof this[entry] != 'undefined') {
                this[entry] = val[entry];
            }
        }

        var R_ID = ['R_EAX', 'R_ECX', 'R_EDX', 'R_EBX', 'R_ESP', 'R_EBP', 'R_ESI', 'R_EDI'];

        this.get = function(id) {
            if (typeof id == 'undefined') {
                return 0;
            }
            if (id >= 0 && id < R_ID.length) {
                return this[R_ID[id]];
            }
            return 0;
        };

        this.set = function(id, val) {
            assert(isInt(id));
            if(id == CONST.R_NONE) return ;
            assert(id >= 0 && id < 8);
            this[R_ID[id]] = val;
        };
    };

    window.Registers = registers;
    window.PipelineRegisters = pipeline_registers;

})();
