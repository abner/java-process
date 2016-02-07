#!/bin/bash

javac EchoMessage.java -source 1.7 -target 1.7
jar cfm EchoMessage.jar MANIFEST.MF *.class 
