/*
 * File: controller.js
 * Author: Zhang Linghao <zlhdnc1994gmail.com>
 */

(function(){

    window.YOSyntaxError = function(lineNum) {
        this.lineNum = lineNum;
        this.msg = "Invalid syntax at line " + (lineNum + 1);
    };

    window.YOSyntaxError.prototype.toString = function() {
        return this.msg;
    };

    window.YOReload = function(needUpdate) {
        window.stopTimer();
        if(typeof YOLoaded == 'undefined') {
            $('#drop_area').text("You have imported nothing :(").html();
        }
        YOLoader(window.YOData, window.YOName, needUpdate);
    };

    window.YOLoader = function(data, fileName, needUpdate) {
        console.log("Triggered");
        window.YOData = data;
        window.YOName = fileName;
        var start = new Date();
        var lines = data.split("\n");
        //console.log("Total Line: " + lines.length);
        window.YOFile = [];
        window.VM.M = new Memory();
        window.VM.R = new Registers();
        var patt = /^\s*0x([0-9a-f]+)\s*:(?:\s*)([0-9a-f]*)\s*(?:\|(?:.*))$/i;
        var empty_pattern = /^\s*((?:\|).*)?$/;
        try {
            for(var lineNum = 0; lineNum < lines.length; ++ lineNum) {
                //console.log(lines[lineNum]);
                lines[lineNum] = $.trim(lines[lineNum]);
                //console.log("Current Line is Line " + (lineNum + 1));
                //console.log("Content is: " + lines[lineNum]);
                if(empty_pattern.test(lines[lineNum])) {
                    continue;
                }
                YOFile.push(lines[lineNum]);
                var match = patt.exec(lines[lineNum]);
                if (match == null) {
                    //console.log(match);
                    throw new YOSyntaxError(lineNum);
                }
                if (match[2].length % 2 == 1) {
                    throw new YOSyntaxError(lineNum);
                }
                var addr = parseInt(match[1], 16);
                //console.log(addr);
                for(var cPos = 0; cPos < match[2].length; cPos += 2, ++ addr) {
                    var tmpByte = parseInt(match[2][cPos] + match[2][cPos + 1], 16);
                    VM.M.writeByte(addr, tmpByte);
                }
                //console.log((cPos >> 1) + " byte(s) writed.");
            }
            if(!window.YOLoaded)
                $('#drop_area').text(fileName + " loaded in " + (((new Date()).getMilliseconds() - start.getMilliseconds()) / 1000).toFixed(3) + " s").html();
        } catch (e) {
            $('#drop_area').text("File " + fileName + ": " + e.toString());
        }
        VM.CPU = new CPU();
        if(needUpdate || !window.YOLoaded)
            updateDisplay(VM.CPU.getInput());
        window.YOLoaded = true;
    }
})();
