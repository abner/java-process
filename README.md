# java-process

A node module which provides a class JavaProcess which allow to spawn a java proccess within Node and interact with this java process
through the stdin, stderr and stdout.

I personally use this idea to allow a simple and easy integration from NodeJs to Java. 

One of my use case are like this i provide some jar (all-in-one "one-jar" or "fatjar") app which receives inputs from stdin (System.in), 
do some task, and then send the response through the stdout (System.out).

Why to use this approach? In my case i was developing using Electron (node+webkit Desktop solution) and have some needs to provide features related to digital signature
using Smart Token. So i already had this solution in Java supporting multiple Token drives. Off course i would provide this from Java to Node
through a Http Service or Socket, but that in some Operating Systems (now Windows i'm talking about you :|) i would face some
problems because of firewall blocking and then relying on user to allow the communication. So for this particular user case a interprocess
communication with a child process appears to be a good and simple solution. So far, at least :D


Obvisously, the java runtime is required, but there is no requirement tied to specific java version. 

So much talk until now, let's go see java_process in action:


``` js

var java_process = require("./java_process");

var jp = new java_process.config('someApp.jar', 'someArg=1', function() {
  jp.on('stdout', function(data) {
    console.log("Some message java sent through System.out: ', String(data));
  });
  
  jp.writeDataToProcess('Some message to input to java process');
  
  

});
```


