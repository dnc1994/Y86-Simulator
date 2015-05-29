/*
 * File: memory.js
 * Author: Zhang Linghao <zlhdnc1994@gmail.com>
 */

(function() {

    var memory = function(Blocks) {
        // 每个 block 大小为 64K
        // 默认为 1024 个 block, 总共 64M 内存
        if (typeof Blocks == 'undefined') Blocks = 1024;
        assert(isInt(Blocks) && Blocks <= 65536);

        window.container = new Array(Blocks);
        window.mapping = {};
        window.allocatedBlocks = 0;
        // 记录当前最大有效地址
        this.maxMemAddr = 0;

        window.VMOutOfMemoryException = function(msg) {
            this.message = msg;
        };
        VMOutOfMemoryException.prototype.toString = function() {
            return this.message;
        };

        // 分配 block
        var allocateMemBlock = function(address) {
            //console.log('allocateMemBlock: ' + address);
            assert(isInt(address));
            address = toUnsigned(address);

            var highAddr = address >>> 16;
            if(allocatedBlocks >= container.size) {
                throw new VMOutOfMemoryException("Virtual Machine runs out of memory!");
            }
            container[mapping[highAddr] = allocatedBlocks] = new Int8Array(65536);
            // 初始化本页内存为 0xCC
            for (var i in container[allocatedBlocks])
                container[allocatedBlocks][i] = 0xCC;
            ++ allocatedBlocks;
        };

        this.readByte = function(address) {
            //console.log('readByte: ' + address);
            assert(isInt(address));
            address = toUnsigned(address);

            var highAddr = address >>> 16, lowAddr = address & 65535;
            if (typeof mapping[highAddr] == 'undefined') return 0;
            return container[mapping[highAddr]][lowAddr] & 255;
        };

        this.readUnsigned = function(address) {
            //console.log('readUnsigned: ' + address);
            assert(isInt(address));
            address = toUnsigned(address);

            return this.readByte(address) + ( this.readByte(address + 1) * 256 ) + ( this.readByte(address + 2) * 65536) + ( this.readByte(address + 3) * 16777216);
        };

        this.readInt = function(address) {
            //console.log('readInt: ' + address);
            assert(isInt(address));
            address = toUnsigned(address);

            return this.readUnsigned(address) | 0;
        };

        this.writeByte = function(address, val) {
            //console.log('writeByte: ' + address + ' <- ' + val);
            assert(isInt(address));
            address = toUnsigned(address);
            assert(isInt(val) && val < 256 && val >= 0);

            var highAddr = address >>> 16, lowAddr = address & 65535;
            if (typeof mapping[highAddr] == 'undefined') allocateMemBlock(address);
            container[mapping[highAddr]][lowAddr] = val;

            if (address > this.maxMemAddr) this.maxMemAddr = address;
        };

        this.writeInt = function(address, val) {
            //console.log('writeInt: ' + address + ' <- ' + val);
            assert(isInt(address));
            address = toUnsigned(address);
            val = toUnsigned(val);

            var highAddr = address >>> 16, lowAddr = address & 65535;
            if (typeof mapping[highAddr] == 'undefined') allocateMemBlock(address);
            for (var i = 0; i < 4; ++ i) {
                container[mapping[highAddr]][lowAddr + i] = val & 255;
                val = val >>> 8;
            }

            if (address > this.maxMemAddr) this.maxMemAddr = address;
        };
    };

    window.Memory = memory;

})();
