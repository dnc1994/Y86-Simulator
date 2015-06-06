/*
 * File: cache.js
 * Author: Zhang Linghao <zlhdnc1994@gmail.com>
 */

(function() {

    var lineType = function () {
        this.Block = new Int32Array(2);
        this.valid = false;
        this.dirty = false;
        this.tag = 0;
        this.countVisit = 0;
    };

    var setType = function() {
        this.Line = [new lineType(), new lineType()];
    };

    var cacheType = function() {
        this.Set = [new setType(), new setType()];
    };

    var cache = function() {
        // S = 2, E = 2, B = 64, m = 32
        // Cache 中数据以 Little Endian 存储和传输, 与内存的存储格式一致

        window.dataCache = new cacheType();
        this.countCacheHit = 0;
        this.countCacheMiss = 0;

        // 一律通过 Memory 来调用, 所以 address 已经合法
        this.read = function(address) {
            var index = (address >>> 3) & 1;
            var offset = (address >>> 2) & 1;
            var tag = ((address >>> 4) << 4) | (address & 3);
            var lineNum;

            for (lineNum in [0, 1]) {
                // Cache Hit
                if (dataCache.Set[index].Line[lineNum].valid && dataCache.Set[index].Line[lineNum].tag == tag) {
                    //console.log('cache read hit @ line ' + lineNum +', address = ' + address);
                    ++ this.countCacheHit;
                    ++ dataCache.Set[index].Line[lineNum].countVisit;
                    return dataCache.Set[index].Line[lineNum].Block[offset];
                }
            }

            // 处理 Cache miss
            //console.log('cache read miss, address = ' + address);
            ++ this.countCacheMiss;
            this.handleCacheMiss(address);
            for (lineNum in [0, 1]) {
                if (dataCache.Set[index].Line[lineNum].valid && dataCache.Set[index].Line[lineNum].tag == tag) {
                    //console.log('data read @ line ' + lineNum +', address = ' + address);
                    ++ dataCache.Set[index].Line[lineNum].countVisit;
                    return dataCache.Set[index].Line[lineNum].Block[offset];
                }
            }
        };

        this.write = function(address, val) {
            var index = (address >>> 3) & 1;
            var offset = (address >>> 2) & 1;
            var tag = ((address >>> 4) << 4) | (address & 3);
            var lineNum;

            for (lineNum in [0, 1]) {
                // Cache Hit
                if (dataCache.Set[index].Line[lineNum].valid && dataCache.Set[index].Line[lineNum].tag == tag) {
                    //console.log('cache write hit @ line ' + lineNum +', address = ' + address);
                    ++ this.countCacheHit;
                    dataCache.Set[index].Line[lineNum].dirty = true;
                    dataCache.Set[index].Line[lineNum].Block[offset] = val;
                    //console.log('value written = ' + val);
                    ++ dataCache.Set[index].Line[lineNum].countVisit;
                    return;
                }
            }

            // 处理 Cache miss
            //console.log('cache write miss, address = ' + address);
            ++ this.countCacheMiss;
            this.handleCacheMiss(address);
            for (lineNum in [0, 1]) {
                if (dataCache.Set[index].Line[lineNum].valid && dataCache.Set[index].Line[lineNum].tag == tag) {
                    //console.log('data written @ line ' + lineNum +', address = ' + address);
                    dataCache.Set[index].Line[lineNum].dirty = true;
                    dataCache.Set[index].Line[lineNum].Block[offset] = val;
                    ++ dataCache.Set[index].Line[lineNum].countVisit;
                }
            }
        };

        this.handleCacheMiss = function(address) {
            //console.log('handling cache miss...');
            var index = (address >>> 3) & 1;
            var offset = (address >>> 2) & 1;
            var tag = ((address >>> 4) << 4) | (address & 3);
            var lineNum;
            var lineDumped = -1;

            if (dataCache.Set[index].Line[0].valid && dataCache.Set[index].Line[1].valid) {
                // 两条线均被占用, 抛弃访问次数少的那条线
                lineDumped = lineNum = dataCache.Set[index].Line[0].countVisit >= dataCache.Set[index].Line[1].countVisit ? 1 : 0;
                // 数据被修改过, 需写回内存
                if (dataCache.Set[index].Line[lineNum].dirty) {
                    //console.log('set ' + index + ' line ' + lineNum + ' dumped and data written back to memory');
                    // 根据 tag 和 index 计算对应的(低位)内存地址
                    var addr = dataCache.Set[index].Line[lineNum].tag | (index << 3);
                    VM.M.writeWord(addr, dataCache.Set[index].Line[lineNum].Block[0]);
                    VM.M.writeWord(addr + 4, dataCache.Set[index].Line[lineNum].Block[1]);
                }
            }

            //if (lineDumped == -1) console.log('no line dumped');

            // 将数据写入未被占用的线
            lineNum = (lineDumped != -1 ? lineDumped : (dataCache.Set[index].Line[0].valid ? 1 : 0));
            //console.log('load to empty line ' + lineNum);
            dataCache.Set[index].Line[lineNum].valid = true;
            dataCache.Set[index].Line[lineNum].dirty = false;
            dataCache.Set[index].Line[lineNum].tag = tag;
            dataCache.Set[index].Line[lineNum].Block[0] = VM.M.readWord(address + (!offset ? 0 : -4));
            dataCache.Set[index].Line[lineNum].Block[1] = VM.M.readWord(address + (!offset ? 4 : 0));
            //console.log('value written = ' + dataCache.Set[index].Line[lineNum].Block[0] + ' ' + dataCache.Set[index].Line[lineNum].Block[1];
            dataCache.Set[index].Line[lineNum].countVisit = 0;
        }
    };

    window.Cache = cache;

})();
