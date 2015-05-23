/*
 * File: constants.js
 * Author: Zhang Linghao <zlhdnc1994gmail.com>
 */

(function() {
    var CONST = {
        P_LOAD : 0,
        P_STALL : 1,
        P_BUBBLE: 2,
        P_ERROR : 3,

        I_NOP : 0,
        I_HALT : 1,
        I_RRMOVL : 2,
        I_IRMOVL : 3,
        I_RMMOVL : 4,
        I_MRMOVL : 5,
        I_OPL : 6,
        I_JXX : 7,
        I_CALL : 8,
        I_RET : 9,
        I_PUSHL : 0xA,
        I_POPL : 0xB,
        I_IADDL : 12,
        I_LEAVE : 13,

        A_ADD : 0,
        A_SUB : 1,
        A_AND : 2,
        A_XOR : 3,
        A_NONE : 4,

        F_OF : 1, // OF at bit 0
        F_SF : 2, // SF at bit 1
        F_ZF : 4, // ZF at bit 2

        C_TRUE : 0,
        C_LE : 1,
        C_L : 2,
        C_E : 3,
        C_NE : 4,
        C_GE : 5,
        C_G : 6,

        S_BUB : 0,
        S_AOK : 1,
        S_ADR : 2,
        S_INS : 3,
        S_HLT : 4,
        S_PIP : 5,

        R_EAX : 0,
        R_ECX : 1,
        R_EDX : 2,
        R_EBX : 3,
        R_ESP : 4,
        R_EBP : 5,
        R_ESI : 6,
        R_EDI : 7,
        R_NONE : 0xF,

        DEF_CC : 4 //0b100
    }

    window.getStatName = function(id) {
        id = parseInt(id);
        if (id < 0 || id > 5) return null;
        return ['S_BUB', 'S_AOK', 'S_ADR', 'S_INS', 'S_HLT', 'S_PIP'][id];
    }

    window.getInstructionName = function(id) {
        id = parseInt(id);
        if (id < 0 || id > 13) return null;
        return ['I_NOP', 'I_HALT', 'I_RRMOVL', 'I_IRMOVL', 'I_RMMOVL', 'I_MRMOVL', 'I_OPL',
            'I_JXX', 'I_CALL', 'I_RET', 'I_PUSHL', 'I_POPL', 'I_IADDL', 'I_LEAVE'][id];
    };

    window.getRegisterName = function(id) {
        id = parseInt(id);
        if (id == 0xF) return 'R_NONE';
        if (id < 0 || id > 7) return null;
        return ['R_EAX', 'R_ECX', 'R_EDX', 'R_EBX', 'R_ESP', 'R_EBP', 'R_ESI', 'R_EDI'][id];
    };
}
)()