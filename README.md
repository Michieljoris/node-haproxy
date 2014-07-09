node-haproxy
--------

TODO:

* README needs editing
* Remove remaining thalassa cruft from api

Functionality and code lifted and adapted from
[thalassa=aqueduct](https://github.com/PearsonEducation/thalassa-aqueduct)

A node module to leverage HAProxy's ability to gracefully reload config without
any interruption to user, in other words, without dropping any connections.

Best run in a docker container, or run the process with root privileges.

The module can be used in a webserver that implements a rest api, as in the
thalassa-aqueduct implementation, or haproxy config info can come from another
source, such as a database, or a distributed key-value store.

Uses the [haproxy](https://github.com/observing/haproxy) module to manage and
control the HAProxy process.

## HAProxy Fundamentals

Node-haproxy does not try to obfuscate HAProxy, and it's important to know the fundamentals of how HAProxy works to understand node-haproxy. The API mirrors HAProxy's semantics. The [HAProxy documentation](http://cbonte.github.io/haproxy-dconv/configuration-1.4.html) contains a wealth of detailed information.

1. **Frontends** - A "frontend" section describes a set of listening sockets accepting client
connections.

2. **Backends** - A "backend" section describes a set of servers to which the proxy will connect
to forward incoming connections.

3. **Members/Servers** - node-haproxy calls the servers that *backends* route to "members". In other words, members of a backend pool of servers.

4. **Config file** - At startup, HAProxy loads a configuration file and never looks at that file again. node-haproxy manages this by re-templating a new config file and gracefully restarting the HAProxy process.

5. **Stats Socket** - a UNIX socket in stream mode that will return various statistics outputs and even allows some basic configuration tweaking like enabling and disabling existing backend members, setting weights, etc. node-haproxy connects to this socket and provides realtime streaming stats over a web socket stream.



STUB
------


[Description]

Install:

    npm install node-haproxy
	
Add dependency to your project with

    "node-haproxy": "git@github.com/Michieljoris/node-haproxy"
	
or

	"node-haproxy": "*"

Require in a module:

    var node-haproxy = require('node-haproxy');

Use:

See [documentation](https://rawgithub.com/Michieljoris/node-haproxy/master/docs/node-haproxy.html).






