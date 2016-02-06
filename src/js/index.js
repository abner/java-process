var shelljs = require("shelljs");
var javaLocation = shelljs.which("java");
if (!javaLocation) {
    throw new Error("Java executable not found. Check if java is installed and present in PATH environment variable");
}
var result = shelljs.exec("java -version");
var javaVersion = null;
if (result.code === 0) {
    console.log("Java version result: ", result);
    console.log(result.output);
    var match = result.stderr.match(/(?!\.)(\d+(\.\d+)+)(?![\d\.])/);
    if (match.length > 0) {
        javaVersion = match[0];
    }
    console.log("JAVA VERSION: ", javaVersion);
}
