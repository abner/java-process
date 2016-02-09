var java_process_1 = require("./java_process");
var java_process_2 = require("./java_process");
jasmine.getEnv().defaultTimeoutInterval = 15000;
describe("JavaProcess", function () {
    function setupJavaProcess(readyCallback) {
        var proc = new java_process_2.JavaProcess("java/EchoMessage.jar", null, readyCallback);
        return proc;
    }
    it("builds JavaProcess using config function", function () {
        var proc = java_process_1.default("java/EchoMesage.jar", null, function () {
            expect(proc instanceof java_process_2.JavaProcess).toBeTruthy();
        });
    });
    it("should show logging info if debug is ON", function (done) {
        spyOn(console, "log").and.callFake(function () { });
        var proc = setupJavaProcess(function () {
            expect(console.log).toHaveBeenCalled();
            proc.disconnect();
            proc.on("close", function () {
                done();
            });
        });
        proc.setDebug(true);
        proc.start();
    });
    it("ends javaProcess gracefully using a custom disconnect which sends 'exit' message", function (done) {
        var proc = setupJavaProcess(function () {
            var fnCustomDisconnect = function () {
                proc.writeDataToProcess("exit\n");
            };
            proc.setCustomDisconnect(fnCustomDisconnect);
            proc.on("close", function () {
                expect(proc.status().normalExit).toBeTruthy();
                expect(proc.status().exitCode).toEqual(0);
                done();
            });
            proc.disconnect();
        });
        proc.start();
    });
    it("should disconnect using custom disconnect", function (done) {
        var fnCustomDisconnect = jasmine.createSpy('fnCustomDisconnect');
        var proc = setupJavaProcess(function () {
            proc.setCustomDisconnect(fnCustomDisconnect);
            proc.on("close", function () {
                expect(fnCustomDisconnect).toHaveBeenCalled();
                done();
            });
            proc.disconnect();
            proc.kill();
        });
        proc.start();
    });
    it("java process should be ready on the ready callback", function (done) {
        var proc = setupJavaProcess(function () {
            expect(proc.isReady()).toBeTruthy();
            proc.kill();
            proc.on("close", function () {
                done();
            });
        });
        proc.start();
    });
    it("fails if ready msg is not received in child.stdout", function (done) {
        var fnReady = jasmine.createSpy('fnReady');
        var proc = setupJavaProcess(fnReady);
        var notReadyCallback = function () {
            expect(proc.isReady()).toBeFalsy();
            expect(fnReady).not.toHaveBeenCalled();
            done();
        };
        proc.setInitTimeout(500);
        proc.start("readyWrongMessage", notReadyCallback);
    });
    it("should starts the java process communicates with it", function (done) {
        var msg = "TEST JavaProcess";
        var msgExpected = "Echo: " + msg;
        var proc = setupJavaProcess(function () {
            proc.on("stdout", function (data) {
                var msgReceived = String(data);
                msgReceived = msgReceived.replace(/(\r\n|\n|\r)/gm, "");
                if (msgReceived != '') {
                    expect(msgReceived).toEqual(msgExpected);
                }
                proc.disconnect();
            });
            proc.on("close", function () {
                done();
            });
            proc.writeDataToProcess(msg);
            proc.on('error', function (data) {
                fail("Test failed. Not expecting any error");
                proc.disconnect();
            });
        });
        proc.start('READY');
    });
});
//# sourceMappingURL=java_process.spec.js.map