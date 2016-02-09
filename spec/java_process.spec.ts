import java_process from "../src/java_process/java_process";
import {JavaProcess, JavaProcessStatus, ChildProcessExtended } from "../src/java_process/java_process";

(<any>jasmine.getEnv()).defaultTimeoutInterval = 15000;

describe("JavaProcess", () => {
   
    function setupJavaProcess(readyCallback: () => void) {
        var proc = new JavaProcess("java/EchoMessage.jar", null, readyCallback);
        return proc;
    }
    
    
    it("builds JavaProcess using config function", () => {
       var proc = java_process("java/EchoMesage.jar", null, () => {
           expect(proc instanceof JavaProcess).toBeTruthy();
       });
    });

    it("should show logging info if debug is ON", (done) => {

        spyOn(console, "log").and.callFake(() => { });

        var proc = setupJavaProcess(() => {
            expect(console.log).toHaveBeenCalled();
            proc.disconnect();

            
            proc.on("close", () => {
                done();
            });
        });


        proc.setDebug(true);
        proc.start();
    });
    
    it("ends javaProcess gracefully using a custom disconnect which sends 'exit' message", (done) => {
       
        var proc = setupJavaProcess(() => {
            
            var fnCustomDisconnect = () => {
                proc.writeDataToProcess("exit\n");
            };

            proc.setCustomDisconnect(fnCustomDisconnect);

            proc.on("close", () => {
                expect(proc.status().normalExit).toBeTruthy();
                expect(proc.status().exitCode).toEqual(0);        
                done();
            });

            proc.disconnect();
            
        });

        proc.start();
        
    });

    it("should disconnect using custom disconnect", (done) => {
        var fnCustomDisconnect = jasmine.createSpy('fnCustomDisconnect');

        var proc = setupJavaProcess(() => {

            proc.setCustomDisconnect(fnCustomDisconnect);

            proc.on("close", () => {
                expect(fnCustomDisconnect).toHaveBeenCalled();
                done();
            });

            proc.disconnect();
            
            //as we are using a fake disconnect, we have to kill the process, otherwise we would
            // leave a abandonned java process
            proc.kill();
        });

        proc.start();

    });

    it("java process should be ready on the ready callback", (done) => {

        var proc = setupJavaProcess(() => {

            expect(proc.isReady()).toBeTruthy();
            proc.kill();
            proc.on("close", () => {
                done();
            });
        });
        proc.start();
    });

    it("fails if ready msg is not received in child.stdout", (done) => {
        var fnReady = jasmine.createSpy('fnReady');
        var proc = setupJavaProcess(fnReady);

        var notReadyCallback = () => {
            expect(proc.isReady()).toBeFalsy();
            expect(fnReady).not.toHaveBeenCalled();
            done();
        };

        proc.setInitTimeout(500);
        proc.start("readyWrongMessage", notReadyCallback); // <= to force invalid init    
    });

    it("should starts the java process communicates with it", (done) => {
        var msg = "TEST JavaProcess";
        var msgExpected = "Echo: " + msg;

        var proc = setupJavaProcess(() => {
            // listen to javaProcess stdout
            proc.on("stdout", (data: Buffer) => {
                var msgReceived = String(data);
                msgReceived = msgReceived.replace(/(\r\n|\n|\r)/gm, "");
                
                if(msgReceived != '') {
                    expect(msgReceived).toEqual(msgExpected);    
                }
                
                
                // disconnect from javaProcess
                proc.disconnect();
            });

            // only calls jasmine callback after java Process is closed
            proc.on("close", () => {
                done();
            });

            // write the message "TEST JavaProcess" to the JavaProcess stdin
            proc.writeDataToProcess(msg);


            proc.on('error', (data: Buffer) => {
                fail("Test failed. Not expecting any error")
                proc.disconnect();
            });

            /* javaProc.on("disconnect", () => {
                 var status: JavaProcessStatus = proc.status();
                 if (status.childUnaskedExit) {
                     console.log("Test failed");
                     process.exit(1);
                 }
                 if (status.normalExit) {
                     expect()
                     done();
                     process.exit(0);
                 }
                 console.log("DISCONNECTED CALLED");
             })*/

        });

        /* proc.setCustomDisconnect(() => {
             proc.writeDataToProcess("exit");
         });*/
        proc.start('READY');
    });
});