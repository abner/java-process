

import * as java_process from "./java_process";

var javaStartedProcess = java_process.start('java/EchoMessage.jar');

console.log("Java Location", javaStartedProcess.javaLocation);
console.log("Java Version", javaStartedProcess.javaVersion);

var ok = false;

import {ChildProcess} from "child_process";

var childProc: ChildProcess = javaStartedProcess.process;

childProc.stderr.on('data', (err: any) => {
    console.error("ERROR", String(err));
    process.exit(1); 
});
childProc.on("error", (payload: any) => {
    console.error("ERROR",String(payload));
    process.exit(1);
});

childProc.on('close', (code: any) => {
  console.log(`child process exited with code ${code}`);
});

function sendMessage() {
    javaStartedProcess.process.stdin.write("TEST\n");
}

javaStartedProcess.process.stdout.on('data', (buffer: string) => {
    if (String(buffer) == 'READY') {
        console.log("DATA FROM PROCESS OUTPUT >> ", String(buffer));
        sendMessage();
    } else {
        var msg = String(buffer);
        console.log("Process Echoed this Message > ", msg);
        
        if(msg == "Echo: TEST") {
          console.info("Test OK");
          process.exit(0);  
        }
        //console.info("Test OK");
        //process.exit(0);
        
    }

});


setTimeout(function() {
        if (ok) {
            console.log("Execution is OK");
            process.exit(0);
        } else {
            console.log("Test failed!");
        }
    }, 5000);
