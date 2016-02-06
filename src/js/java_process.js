var shelljs = require("shelljs");
function start(jarPath, args) {
    var javaLocation = shelljs.which("java");
    if (!javaLocation) {
        throw new Error("Java executable not found. Check if java is installed and present in PATH environment variable");
    }
    var result = shelljs.exec("java -version");
    var javaVersion = null;
    if (result.code === 0) {
        var match = result.stderr.match(/(?!\.)(\d+(\.\d+)+)(?![\d\.])/);
        if (match.length > 0) {
            javaVersion = match[0];
        }
        console.log("JAVA VERSION: ", javaVersion);
    }
    else {
        throw new Error("Error extracting java version");
    }
    var spawn = require("child_process").spawn;
    var argsJava = ["-jar", jarPath];
    if (args) {
        argsJava = argsJava.concat(args);
    }
    var child = spawn("java", argsJava);
    return {
        javaLocation: javaLocation,
        javaVersion: javaVersion,
        process: child
    };
}
exports.start = start;
