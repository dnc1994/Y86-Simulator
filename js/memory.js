/*
 * File: memory.js
 * Author: Zhang Linghao <zlhdnc1994gmail.com>
 */

(function() {
    var memory = function(Blocks) { // Block size is 64K.
        if(typeof Blocks == 'undefined') Blocks = 1024; // Default mem size: 64M
        assert(isInt(Blocks) && Blocks <= 65536); // No larger than 4G. (DANGEROUS!!!)
        window.container = new Array(Blocks);
        window.mapping = {};
        window.allocatedBlocks = 0;
        window.VMOutOfMemoryException = function(msg) { this.message = msg; };
        VMOutOfMemoryException.prototype.toString = function() { return this.message; };
        var allocateMemBlock = function(address) {
            assert(isInt(address));
            var highAddr = address >>> 16;
            if(allocatedBlocks >= container.size) {
                throw new VMOutOfMemoryException("Virtual Machine runs out of memory!");
            }
            container[mapping[highAddr] = allocatedBlocks] = new Int8Array(65536);
            ++ allocatedBlocks;
        };

        this.readByte = function(address) {
            assert(isUnsigned(address));
            var highAddr = address >>> 16, lowAddr = address & 65535;
            if(typeof mapping[highAddr] == 'undefined') return 0;
            return container[mapping[highAddr]][lowAddr] & 255; // Force unsigned int8.
        };

        this.readUnsigned = function(address) {
            //assert(isUnsigned(address));
            return this.readByte(address) + ( this.readByte(address + 1) * 256 ) + ( this.readByte(address + 2) * 65536) + ( this.readByte(address + 3) * 16777216);
        };

        this.readInt = function(address) { // Signed int32.
            return this.readUnsigned(address) | 0; // Change to signed int32.
        };

        this.writeInt = function(address, val) {
            assert(isInt(address));
            address = toUnsigned(address);
            val = toUnsigned(val);
            //assert(address & 3 != 0); // Align to 4 byte.
            var highAddr = address >>> 16, lowAddr = address & 65535;
            if (typeof mapping[highAddr] == 'undefined') allocateMemBlock(address);
            for(var i = 0; i < 4; ++ i) {
                container[mapping[highAddr]][lowAddr + i] = val & 255;
                val = val >>> 8;
            }
        };

        this.writeByte = function(address, val) {
            assert(isUnsigned(address) && isInt(val) && val < 256 && val >= 0);
            var highAddr = address >>> 16, lowAddr = address & 65535;
            if (typeof mapping[highAddr] == 'undefined') allocateMemBlock(address);
            container[mapping[highAddr]][lowAddr] = val;
        }
    };

    window.Memory = memory;
})();
