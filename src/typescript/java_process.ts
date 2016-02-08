import * as child_process from "child_process";
import * as shelljs from "shelljs";

import * as stream from "stream";

export interface JavaInfo {
    location: string;
    version: string;
}

export interface ChildProcessExtended extends child_process.ChildProcess {
    connected: boolean;
}

export interface JavaProcessStatus {
    lastErrorFromStdErr: string;
    childUnaskedExit: boolean;
    exitSignal: string;
    errorsFromStdErr: number;
    procErrorOcurred: boolean;
    lastProcError: string;
    msgSent: number;
    normalExit: boolean;
    exitCode: number;

}

export class JavaProcess {
    DEFAULT_ENCODING = 'UTF-8';
    
    public static get DEFAULT_INIT_TIMEOUT(): number    { return 5000; }
    
    private javaInfo: JavaInfo;
    private process: ChildProcessExtended = null;
    private firstMessageReceived: boolean = false;
    private started: boolean = false;
    private procErrorOcurred: boolean = false;
    private lastProcError: string;
    private closed: boolean = false;
    private closeData: any;
    private ready: boolean = false;
    //private lastError: string;
    private errorsFromStdErr: number = 0;
    private msgSent: number = 0;
    private lastErrorFromStdErr: string;
    private childUnaskedExit: boolean = false;
    private exitSignal: string;
    private normalExit: boolean;
    private exited: boolean = false;
    private exitCode: number;

    private pipesOutput: stream.PassThrough[] = [];
    private pipesErr: stream.PassThrough[] = [];
    private customDisconnect: Function = null;
    
    private debugOn = false;
    private readyCheckString: string = null;
    
    private initTimeout = JavaProcess.DEFAULT_INIT_TIMEOUT;
    
    private userNotReadyCallback: Function = null;

    public status(): JavaProcessStatus {
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
    }

    constructor(private jarPath: string, private args: string[], private readyFn?: Function) {
        this.javaInfo = checkJava();


    }
    
    private initTimeoutFn() {
        if(!this.ready) {
            if(this.userNotReadyCallback) {
                this.userNotReadyCallback.apply(this);
                if(!this.closed) {
                    this.process.kill("SIGTERM");    
                }
            } else {
                this.kill("SIGTERM");
                throw new Error("Process did not started properly! " + this.readyCheckString + " not received in " + this.initTimeout  + " miliseconds!");    
            }
            
        }
    }
    

    public start(readyCheck?: string, fnNotReady?: Function) {
        this.started = true;
        this.spawn();
        if(readyCheck) {
            this.readyCheckString = readyCheck;
            this.userNotReadyCallback = fnNotReady;
            setTimeout(this.initTimeoutFn.bind(this), this.initTimeout);
        } else {
            this.onReady(this);
        }
    }
    
    setInitTimeout(timeout: number) {
        this.initTimeout = timeout;
    }

    onReady(javaProcess: JavaProcess): void {
        this.ready = true;
        this.readyFn.apply(this, [this]);
    }
    
    isReady() {
        return this.ready && !this.exited;
    }
    
    wasStarted() {
        return this.started;
    }
    
    
    setCustomDisconnect(disconnectFn: Function) {
        this.customDisconnect = disconnectFn;
    }
    
    setDebug(debug:boolean) {
        this.debugOn = true;
    }
    
    kill(signal?: string) {
        this.process.kill(signal ? signal : 'SIGTERM');
    }

    disconnect() {
        this.debug("Disconnect called on JavaProcess instance");
        this.debug("started: ", this.started);
        this.debug("closed: ", this.closed);
        if (this.started) {
            if(this.customDisconnect && this.customDisconnect instanceof Function) {
                this.customDisconnect.bind(this).call();
            } else {
                this.process.kill("SIGTERM");    
            }
            
        }
    }

    onDataOnStdErr(data: Buffer) {
        this.errorsFromStdErr++;
        this.lastErrorFromStdErr = String(data);
    }

    onDataOnStdOut(data: Buffer) {
        var msg: string = String(data);
        this.debug("MSG RECEIVED FROM STDOUT", msg);

        if (!this.ready && this.readyCheckString && this.compareWithoutNewLinesAndLowerCase(this.readyCheckString, msg)) {
            this.onReady(this);
        }

    }
    
    private compareWithoutNewLinesAndLowerCase(value1: string, value2: string) {
        if(value1 == null || value2 == null) {
            return true;
        }
        return (trimNewLines(value1).toLowerCase() == trimNewLines(value2).toLowerCase());
    }

    onError(data: Buffer) {
        this.debug("ERROR EVENT", String(data));
        this.procErrorOcurred = true;
        this.closed = true;
        this.lastProcError = String(data);
    }

    onClose(code: number, signal: string) {
        this.debug("CLOSE EVENT", code, signal);
        this.closed = true;
        this.closeData = {
            code: code,
            signal: signal
        }
    }

    onDisconnect() {

        this.closed = true;

    }

    onExit(code?: number, signal?: string) {
        this.exited = true;
        this.normalExit = false;
        if (code == 0) {
            this.normalExit = true;
            this.exitCode = 0;
        }
        else if (code == null) {
            this.childUnaskedExit = true;
            this.exitSignal = signal;
        } else {
            this.exitCode = code;
            this.exitSignal = code.toString();
        }
    }

    public on(event: string, callback: Function) {
        if (event == "stdout") {
            var pass = new stream.PassThrough();
            this.process.stdout.pipe(pass);
            pass.on("data", callback.bind(this));
            this.pipesOutput.push(pass);
        }
        else if (event == "stderr") {
            var pass = new stream.PassThrough();
            this.process.stderr.pipe(pass);
            pass.on("data", callback.bind(this));
            this.pipesErr.push(pass);
        }
        else if (["close", "error", "exit", "disconnect"].indexOf(event) > -1) {
            this.process.on(event, callback.bind(this));
        }
    }

    public writeDataToProcess(data: string) {
        this.debug("ASKED FOR WRITE TO PROCESS STDIN");

        if (this.ready) {
            this.msgSent++;
            this.debug("WRITING TO PROCESS STDIN");
            this.process.stdin.write(data + "\n");
        }
    }

    spawn() {
        this.debug("THIS FROM SPAWN ", this);
        this.process = <ChildProcessExtended>spawn(this.jarPath, this.args);
        this.process.on("disconnect", this.onDisconnect.bind(this));
        this.process.on("error", this.onError.bind(this));
        this.process.on("exit", this.onExit.bind(this));
        this.process.on("close", this.onClose.bind(this));
        
        
        this.on("stdout", this.onDataOnStdOut.bind(this));
        
        
        
    }
    
    private debug(message: string, ...optionalParams: any[]): void {
        if(this.debugOn) {
            console.log(message, optionalParams);   
        }
    }
}

function trimNewLines(input: string): string {
    if(input) {
        return input.replace(/(\r\n|\n|\r)/gm,"");   
    }
    else {
        return null;
    }
}

export function checkJava(): JavaInfo {

    var javaLocation = shelljs.which("java");

    if (!javaLocation) {
        throw new Error("Java executable not found. Check if java is installed and present in PATH environment variable");
    }


    var result = <shelljs.ExecOutputReturnValue> shelljs.exec("java -version", { silent: true });


    let javaVersion: string = null;

    if (result.code === 0) {
        let match: RegExpMatchArray = (<any>result).stderr.match(/(?!\.)(\d+(\.\d+)+)(?![\d\.])/);

        if (match.length > 0) {
            javaVersion = match[0];
        }

    } else {
        throw new Error("Error extracting java version");
    }

    return {
        location: javaLocation,
        version: javaVersion
    }

}
export function spawn(jarPath: string, args?: string[]) {

    var argsJava = ["-jar", jarPath];
    if (args) {
        argsJava = argsJava.concat(args)
    }

    var child: child_process.ChildProcess = child_process.spawn("java", argsJava);

    return child;

}


export default function config( jarPath: string, args: string[], readyFn: Function): JavaProcess {
    var jp = new JavaProcess(jarPath, args, readyFn);    
    return jp;
}