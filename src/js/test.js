var java_process = require("./java_process");
var javaStartedProcess = java_process.start('java/EchoMessage.jar');
console.log("Java Location", javaStartedProcess.javaLocation);
console.log("Java Version", javaStartedProcess.javaVersion);
var ok = false;
var childProc = javaStartedProcess.process;
childProc.stderr.on('data', function (err) {
    console.error("ERROR", String(err));
    process.exit(1);
});
childProc.on("error", function (payload) {
    console.error("ERROR", String(payload));
    process.exit(1);
});
childProc.on('close', function (code) {
    console.log("child process exited with code " + code);
});
function sendMessage() {
    javaStartedProcess.process.stdin.write("TEST\n");
}
javaStartedProcess.process.stdout.on('data', function (buffer) {
    if (String(buffer) == 'READY') {
        console.log("DATA FROM PROCESS OUTPUT >> ", String(buffer));
        sendMessage();
    }
    else {
        var msg = String(buffer);
        console.log("Process Echoed this Message > ", msg);
        if (msg == "Echo: TEST") {
            console.info("Test OK");
            process.exit(0);
        }
    }
});
setTimeout(function () {
    if (ok) {
        console.log("Execution is OK");
        process.exit(0);
    }
    else {
        console.log("Test failed!");
    }
}, 5000);
