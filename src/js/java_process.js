var child_process = require("child_process");
var shelljs = require("shelljs");
var stream = require("stream");
var JavaProcess = (function () {
    function JavaProcess(jarPath, args, readyFn) {
        this.jarPath = jarPath;
        this.args = args;
        this.readyFn = readyFn;
        this.DEFAULT_ENCODING = 'UTF-8';
        this.process = null;
        this.firstMessageReceived = false;
        this.started = false;
        this.procErrorOcurred = false;
        this.closed = false;
        this.ready = false;
        this.errorsFromStdErr = 0;
        this.msgSent = 0;
        this.childUnaskedExit = false;
        this.exited = false;
        this.pipesOutput = [];
        this.pipesErr = [];
        this.customDisconnect = null;
        this.debugOn = false;
        this.readyCheckString = null;
        this.initTimeout = JavaProcess.DEFAULT_INIT_TIMEOUT;
        this.userNotReadyCallback = null;
        this.javaInfo = checkJava();
    }
    Object.defineProperty(JavaProcess, "DEFAULT_INIT_TIMEOUT", {
        get: function () { return 5000; },
        enumerable: true,
        configurable: true
    });
    JavaProcess.prototype.status = function () {
        return {
            lastErrorFromStdErr: this.lastErrorFromStdErr,
            childUnaskedExit: this.childUnaskedExit,
            exitSignal: this.exitSignal,
            errorsFromStdErr: this.errorsFromStdErr,
            procErrorOcurred: this.procErrorOcurred,
            lastProcError: this.lastProcError,
            msgSent: this.msgSent,
            normalExit: this.normalExit,
            exitCode: this.exitCode
        };
    };
    JavaProcess.prototype.initTimeoutFn = function () {
        if (!this.ready) {
            if (this.userNotReadyCallback) {
                this.userNotReadyCallback.apply(this);
                if (!this.closed) {
                    this.process.kill("SIGTERM");
                }
            }
            else {
                this.kill("SIGTERM");
                throw new Error("Process did not started properly! " + this.readyCheckString + " not received in " + this.initTimeout + " miliseconds!");
            }
        }
    };
    JavaProcess.prototype.start = function (readyCheck, fnNotReady) {
        this.started = true;
        this.spawn();
        if (readyCheck) {
            this.readyCheckString = readyCheck;
            this.userNotReadyCallback = fnNotReady;
            setTimeout(this.initTimeoutFn.bind(this), this.initTimeout);
        }
        else {
            this.onReady(this);
        }
    };
    JavaProcess.prototype.setInitTimeout = function (timeout) {
        this.initTimeout = timeout;
    };
    JavaProcess.prototype.onReady = function (javaProcess) {
        this.ready = true;
        this.readyFn.apply(this, [this]);
    };
    JavaProcess.prototype.isReady = function () {
        return this.ready && !this.exited;
    };
    JavaProcess.prototype.wasStarted = function () {
        return this.started;
    };
    JavaProcess.prototype.setCustomDisconnect = function (disconnectFn) {
        this.customDisconnect = disconnectFn;
    };
    JavaProcess.prototype.setDebug = function (debug) {
        this.debugOn = true;
    };
    JavaProcess.prototype.kill = function (signal) {
        this.process.kill(signal ? signal : 'SIGTERM');
    };
    JavaProcess.prototype.disconnect = function () {
        this.debug("Disconnect called on JavaProcess instance");
        this.debug("started: ", this.started);
        this.debug("closed: ", this.closed);
        if (this.started) {
            if (this.customDisconnect && this.customDisconnect instanceof Function) {
                this.customDisconnect.bind(this).call();
            }
            else {
                this.process.kill("SIGTERM");
            }
        }
    };
    JavaProcess.prototype.onDataOnStdErr = function (data) {
        this.errorsFromStdErr++;
        this.lastErrorFromStdErr = String(data);
    };
    JavaProcess.prototype.onDataOnStdOut = function (data) {
        var msg = String(data);
        this.debug("MSG RECEIVED FROM STDOUT", msg);
        if (!this.ready && this.readyCheckString && this.compareWithoutNewLinesAndLowerCase(this.readyCheckString, msg)) {
            this.onReady(this);
        }
    };
    JavaProcess.prototype.compareWithoutNewLinesAndLowerCase = function (value1, value2) {
        if (value1 === null || value2 === null) {
            return true;
        }
        return (trimNewLines(value1).toLowerCase() === trimNewLines(value2).toLowerCase());
    };
    JavaProcess.prototype.onError = function (data) {
        this.debug("ERROR EVENT", String(data));
        this.procErrorOcurred = true;
        this.closed = true;
        this.lastProcError = String(data);
    };
    JavaProcess.prototype.onClose = function (code, signal) {
        this.debug("CLOSE EVENT", code, signal);
        this.closed = true;
        this.closeData = {
            code: code,
            signal: signal
        };
    };
    JavaProcess.prototype.onDisconnect = function () {
        this.closed = true;
    };
    JavaProcess.prototype.onExit = function (code, signal) {
        this.exited = true;
        this.normalExit = false;
        if (code === 0) {
            this.normalExit = true;
            this.exitCode = 0;
        }
        else if (code === null) {
            this.childUnaskedExit = true;
            this.exitSignal = signal;
        }
        else {
            this.exitCode = code;
            this.exitSignal = code.toString();
        }
    };
    JavaProcess.prototype.buildPassThrough = function (streamTarget, callback) {
        var pass = new stream.PassThrough();
        streamTarget.pipe(pass);
        pass.on("data", callback.bind(this));
        return pass;
    };
    JavaProcess.prototype.on = function (event, callback) {
        if (event === "stdout") {
            var passOut = this.buildPassThrough(this.process.stdout, callback);
            this.pipesOutput.push(passOut);
        }
        else if (event === "stderr") {
            var passErr = this.buildPassThrough(this.process.stderr, callback);
            this.pipesErr.push(passErr);
        }
        else if (["close", "error", "exit", "disconnect"].indexOf(event) > -1) {
            this.process.on(event, callback.bind(this));
        }
    };
    JavaProcess.prototype.writeDataToProcess = function (data) {
        this.debug("ASKED FOR WRITE TO PROCESS STDIN");
        if (this.ready) {
            this.msgSent++;
            this.debug("WRITING TO PROCESS STDIN");
            this.process.stdin.write(data + "\n");
        }
    };
    JavaProcess.prototype.spawn = function () {
        this.debug("THIS FROM SPAWN ", this);
        this.process = spawn(this.jarPath, this.args);
        this.process.on("disconnect", this.onDisconnect.bind(this));
        this.process.on("error", this.onError.bind(this));
        this.process.on("exit", this.onExit.bind(this));
        this.process.on("close", this.onClose.bind(this));
        this.on("stdout", this.onDataOnStdOut.bind(this));
    };
    JavaProcess.prototype.debug = function (message) {
        var optionalParams = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            optionalParams[_i - 1] = arguments[_i];
        }
        if (this.debugOn) {
            console.log(message, optionalParams);
        }
    };
    return JavaProcess;
})();
exports.JavaProcess = JavaProcess;
function trimNewLines(input) {
    if (input) {
        return input.replace(/(\r\n|\n|\r)/gm, "");
    }
    else {
        return null;
    }
}
function checkJava() {
    var javaLocation = shelljs.which("java");
    if (!javaLocation) {
        throw new Error("Java executable not found. Check if java is installed and present in PATH environment variable");
    }
    var result = shelljs.exec("java -version", { silent: true });
    var javaVersion = null;
    if (result.code === 0) {
        var match = result.stderr.match(/(?!\.)(\d+(\.\d+)+)(?![\d\.])/);
        if (match.length > 0) {
            javaVersion = match[0];
        }
    }
    else {
        throw new Error("Error extracting java version");
    }
    return {
        location: javaLocation,
        version: javaVersion
    };
}
exports.checkJava = checkJava;
function spawn(jarPath, args) {
    var argsJava = ["-jar", jarPath];
    if (args) {
        argsJava = argsJava.concat(args);
    }
    var child = child_process.spawn("java", argsJava);
    return child;
}
exports.spawn = spawn;
function config(jarPath, args, readyFn) {
    var jp = new JavaProcess(jarPath, args, readyFn);
    return jp;
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = config;
//# sourceMappingURL=java_process.js.map