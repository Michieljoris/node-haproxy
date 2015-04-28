node-haproxy
--------

Set, modify and hot load haproxy configuration from node.

Functionality and code lifted and adapted from
[thalassa=aqueduct](https://github.com/PearsonEducation/thalassa-aqueduct). 

You can run this module standalone (`npm install -g node-haproxy; node-haproxy --ipc`) and
communicate with it using ipc (`var ipcClient = require ('node-haproxy/src/ipc-client'`) 
or use the api directly (`var haproxy = require('node-haproxy'`).

In both cases it will fire up a haproxy instance which you can query and modify programmatically.

When modifying or adding/removing front and backends programmatically haproxy is
reconfigured on the fly. Back and frontends are persisted between restarts of the node process.

Changes are saved to a leveldb.

When no options are passed in, the included haproxy executable (v1.5) is used.
The leveldb and persisted data is stored by default in the module's folder. Which means
that on updating or reinstalling the module the data is wiped.

Locations of the leveldb, template haproxy.cfg file and persisted info file can
be set using options, amongst some more settings relating to haproxy.

Paraphrased from the original readme:

## HAProxy Fundamentals

Node-haproxy does not try to obfuscate HAProxy, and it's important to know the fundamentals of how HAProxy works to understand node-haproxy. The API mirrors HAProxy's semantics. The [HAProxy documentation](http://cbonte.github.io/haproxy-dconv/configuration-1.4.html) contains a wealth of detailed information.

1. **Frontends** - A "frontend" section describes a set of listening sockets accepting client
connections.

2. **Backends** - A "backend" section describes a set of servers to which the proxy will connect
to forward incoming connections.

3. **Members/Servers** - node-haproxy calls the servers that *backends* route to "members". In other words, members of a backend pool of servers.

4. **Config file** - At startup, HAProxy loads a configuration file and never looks at that file again. node-haproxy manages this by re-templating a new config file and gracefully restarting the HAProxy process.

5. **Stats Socket** - a UNIX socket in stream mode that will return various statistics outputs and even allows some basic configuration tweaking like enabling and disabling existing backend members, setting weights, etc.

## Options

     ./node_modules/.bin/node-haproxy --help
    Options:
    --haproxySocketPath  path to Haproxy socket file
    --haproxyPidPath     path to  Haproxy pid file
    --haproxyCfgPath     generated Haproxy config location
    --templateFile       template used to generate Haproxy config
    --persistence        directory to save configuration
    --dbPath             filesystem path for leveldb
    --sudo               use sudo when starting haproxy
    --which              path for haproxy, set to 'system' to look for it, otherwise the included haproxy (v1.5) is used
      --ipc                start up ipc server

The following functions can be invoked on the required node-haproxy module or
using the ipc-client (`ipcClient(functionName, args`), which uses promises:
Don't forget to call ipcClient.close() if you want to stop the node process..

Example of using the ipc-client:

    ipcClient('getFrontends', [])
      .when(
        function(result) {
          console.log("Frontends\n", result);
          return ipcClient('getBackends', []);
        })
      .when(
        function(result) {
          console.log("Backends\n", result);
          ipcClient.close();
        },
        function(error) {
          console.log("Error\n", error);
          ipcClient.close();
        }

      );

### getFrontends()

Returns Array of `frontend` objects for all of the frontends configured 

For example:

    [{
        "id": "frontend/myapp",
        "_type": "frontend",
        "key": "myapp",
        "bind": "*:8080,*:80",
        "backend": "live",
        "mode": "http",
        "keepalive": "default",
        "rules": [{
            "type": "header",
            "header": "host",
            "operation": "hdr_dom",
            "value": "staged.myapp.com",
            "backend": "staged"
        }],
        "natives": []
    }]


### getFrontend(key)

Gets a specific frontend by `key`. 


### putFrontend(key, obj)

Create or update a `frontend` by `key`. 

    {
        "bind": "10.2.2.2:80,*:8080" // IP and ports to bind to, comma separated, host may be *
      , "backend": "foo"      // the default backend to route to, it must be defined already
      , "mode": "tcp"         // default: http, expects tcp|http
      , "keepalive": "close"  // default: "default", expects default|close|server-close
      , "rules": []           // array of rules, see below
      , "natives": []         // array of strings of raw config USE SPARINGLY!!
    }

### deleteFrontend(key)

Delete a specific frontend by `key`. 


### getBackends()

Returns Array of `backend` objects for all of the backends configured

For example:

    [{
    	"id": "backend/live",
    	"_type": "backend",
    	"key": "live",
    	"type": "dynamic",
    	"name": "classroom-ui",
    	"version": "1.0.0",
    	"balance": "roundrobin",
    	"host": null,
    	"mode": "http",
    	"members": [{
    		"name": "myapp",
    		"version": "1.0.0",
    		"host": "10.10.240.121",
    		"port": 8080,
    		"lastKnown": 1378762056885,
    		"meta": {
    			"hostname": "dev-use1b-pr-01-myapp-01x00x00-01",
    			"pid": 17941,
    			"registered": 1378740834616
    		},
    		"id": "/myapp/1.0.0/10.10.240.121/8080"
    	},
    	{
    		"name": "myapp",
    		"version": "1.0.0",
    		"host": "10.10.240.80",
    		"port": 8080,
    		"lastKnown": 1378762060226,
    		"meta": {
    			"hostname": "dev-use1b-pr-01-myapp-01x00x00-02",
    			"pid": 18020,
    			"registered": 1378762079883
    		},
    		"id": "/myapp/1.0.0/10.10.240.80/8080"
    	}],
    	"natives": []
    }]


### getBackend(key)

Gets a specific `backend` by `key`. 


### putBackend(key, obj)

Create or update a `backend` by `key`. 

    {
        "type" : "dynamic|static" 
      , "name" : "foo" // only required if type = dynamic
      , "version" : "1.0.0" // only required if type = dynamic
      , "balance" : "roundrobin|source" // defaults to roundrobin
      , "host" : "myapp.com"  // default: undefined, if specified request to member will contain this host header
      , "health" : {                 // optional health check
      	  "method": "GET"            // HTTP method
      	, "uri": "/checkity-check"   // URI to call
      	, "httpVersion": "HTTP/1.1"  // HTTP/1.0 or HTTP/1.1 `host` required if HTTP/1.1
      	, "interval": 5000           // period to check, milliseconds
      }
      , "mode" : "http|tcp" // default: http
      , "natives": []  // array of strings of raw config USE SPARINGLY!!
      , "members" : [] // if type = dynamic this is dynamically populated based on role/version subscription
                       // otherwise expects { host: '10.10.10.10', port: 8080}
    }


### deleteBackend(key)

Delete a specific `backend` by `key`. 



### updateBackend(key)

Update a `backend`s `role` and `version` 

    {
        "name": "myapp"		
      , "version": "1.1.0" // version to route to
    }

`name` is actually optional. You may also just send the `version`:

    {
        "version": "1.1.0"
    }


### getHaproxyConfig()

Return the last know generated HAProxy config file contents that were written to the location of `opts.haproxyCfgPath`.


    global
	  log 127.0.0.1 local0
	  log 127.0.0.1 local1 notice
	  daemon
	  maxconn 4096
	  user haproxy 
	  group haproxy 
	  stats socket /tmp/haproxy.status.sock user appuser level admin

	  defaults
	    log global
	    option dontlognull
	    option redispatch
	    retries 3
	    maxconn 2000
	    timeout connect 5000ms
	    timeout client 50000ms
	    timeout server 50000ms

	  listen stats :1988
	    mode http
	    stats enable
	    stats uri /
	    stats refresh 2s
	    stats realm Haproxy\ Stats
	    stats auth showme:showme


	  frontend myapp
	    bind *:8080,*:80
		mode http
		default_backend live
		option httplog
		option http-server-close
		option http-pretend-keepalive
		acl header_uv7vi hdr_dom(host) myapp-staged.com
		use_backend staged if header_uv7vi



	  backend live
	    mode http
		balance roundrobin
		server live_10.10.240.121:8080 10.10.240.121:8080 check inter 2000
		server live_10.10.240.80:8080 10.10.240.80:8080 check inter 2000

	  backend staged
	    mode http
		balance roundrobin
		server staged_10.10.240.174:8080 10.10.240.174:8080 check inter 2000
		server staged_10.10.240.206:8080 10.10.240.206:8080 check inter 2000


#### Routing Rules

There are currently 3 types of rules that can be applied to frontends: `path`, `url`, and `header`.

Path rules support `path`, `path_beg`, and `path_reg` HAProxy operations

	{
	    "type": "path"
	  , "operation": "path|path_beg|path_reg"
	  , "value": "favicon.ico|/ecxd/|^/article/[^/]*$"
	  , "backend": "foo" // if rule is met, the backend to route the request to
	}


Url rules support `url`, `url_beg`, and `url_reg` HAProxy operations

	{
	    "type": "url"
	  , "operation": "url|url_beg|url_reg"
	  , "value": "/bar" // value for the operation
	  , "backend": "bar" // if rule is met, the backend to route the request to
	}

Header rules support `hdr_dom` with a entire value at this point

	{
	    "type": "header"
	  , "header": "host"			// the name of the HTTP header
	  , "operation": "hdr_dom"
	  , "value": "baz.com"
	  , "backend": "baz" // if rule is met, the backend to route the request to
	}

#### Natives

The natives property is an end around way to insert raw lines of config for front ends and backends. Use them sparingly but use them if you need them.


### TODO
* thrown exceptions are are not handled in api.js and dependencies
* remove health checks/roles/version leftover from Aqea
