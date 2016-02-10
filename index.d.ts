/// <reference path="index.ref.d.ts" />
declare module 'java_process/java_process' {
	/// <reference path="../../typings/main/ambient/node/node.d.ts" />
	import * as child_process from "child_process";
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
	    private jarPath;
	    private args;
	    private readyFn;
	    DEFAULT_ENCODING: string;
	    static DEFAULT_INIT_TIMEOUT: number;
	    private javaInfo;
	    private process;
	    private firstMessageReceived;
	    private started;
	    private procErrorOcurred;
	    private lastProcError;
	    private closed;
	    private closeData;
	    private ready;
	    private errorsFromStdErr;
	    private msgSent;
	    private lastErrorFromStdErr;
	    private childUnaskedExit;
	    private exitSignal;
	    private normalExit;
	    private exited;
	    private exitCode;
	    private pipesOutput;
	    private pipesErr;
	    private customDisconnect;
	    private debugOn;
	    private readyCheckString;
	    private initTimeout;
	    private userNotReadyCallback;
	    status(): JavaProcessStatus;
	    constructor(jarPath: string, args: string[], readyFn?: Function);
	    private initTimeoutFn();
	    start(readyCheck?: string, fnNotReady?: Function): void;
	    setInitTimeout(timeout: number): void;
	    onReady(javaProcess: JavaProcess): void;
	    isReady(): boolean;
	    wasStarted(): boolean;
	    setCustomDisconnect(disconnectFn: Function): void;
	    setDebug(debug: boolean): void;
	    kill(signal?: string): void;
	    disconnect(): void;
	    onDataOnStdErr(data: any): void;
	    onDataOnStdOut(data: any): void;
	    private compareWithoutNewLinesAndLowerCase(value1, value2);
	    onError(data: any): void;
	    onClose(code: number, signal: string): void;
	    onDisconnect(): void;
	    onExit(code?: number, signal?: string): void;
	    private buildPassThrough(streamTarget, callback);
	    on(event: string, callback: Function): void;
	    writeDataToProcess(data: string): void;
	    spawn(): void;
	    private debug(message, ...optionalParams);
	}
	export function checkJava(): JavaInfo;
	export function spawn(jarPath: string, args?: string[]): child_process.ChildProcess;
	export default function config(jarPath: string, args: string[], readyFn: Function): JavaProcess;

}
declare module 'java_process' {
	export { default as java_process } from 'java_process/java_process';

}
