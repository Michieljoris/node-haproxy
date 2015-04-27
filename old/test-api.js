
// api.validatepostbackendsubscription = function () {
//   return {
//     payload: {
//      key     : hapi.types.string().optional(),
//      name    : hapi.types.string().optional(),
//      version : hapi.types.string()
//     }
//   };
// };



// api.validateputbackend = function () {
//   return {
//     payload: {
//       _type  : hapi.types.string().optional(),
//      key     : hapi.types.string(),
//      type    : hapi.types.string().valid(['dynamic', 'static']),
//      name    : hapi.types.string().optional(),
//      version : hapi.types.string().optional(),
//      balance : hapi.types.string().optional(),
//      host    : hapi.types.string().optional(),
//      mod    : hapi.types.string().valid(['http', 'tcp']).optional(),
//      members : hapi.types.array().optional(),
//      natives : hapi.types.array().optional(),
//      health  : hapi.types.object({
//                 method: hapi.types.string().valid(['get','post']).optional(),
//                 uri: hapi.types.string().optional(),
//                 httpversion: hapi.types.string().valid(['http/1.0', 'http/1.1']).optional(),
//                 interval: hapi.types.number().min(1).optional()
//               }).optional()
//     }
//   };
// };


// api.validateputfrontend = function () {
//   return {
//     payload: {
//       _type     : hapi.types.string().optional(),
//       key       : hapi.types.string(),
//       bind      : hapi.types.string(),
//       backend   : hapi.types.string(),
//       mode      : hapi.types.string().valid(['http', 'tcp']).optional(),
//       keepalive : hapi.types.string().valid(['default','close','server-close']).optional(),
//       rules     : hapi.types.array().optional(),
//       natives   : hapi.types.array().optional()
//     }
//   };
// };

var haproxy = module.exports({ ipc: true });

// setTimeout(function() {
//   haproxy.putBackend('backend1', {
//     // "type" : "dynamic|static" 
//     "type" : "static" 
//     // , "name" : "foo" // only required if type = dynamic
//     // , "version" : "1.0.0" // only required if type = dynamic
//     // , "balance" : "roundrobin|source" // defaults to roundrobin
//     // , "host" : "myapp.com"  // default: undefined, if specified request to member will contain this host header
//     // , "health" : {                 // optional health check
//     //     "method": "GET"            // HTTP method
//     //     , "uri": "/checkity-check"   // URI to call
//     //     , "httpVersion": "HTTP/1.0"  // HTTP/1.0 or HTTP/1.1 `host` required if HTTP/1.1
//     //     , "interval": 5000           // period to check, milliseconds
//     // }
//     // , "mode" : "http|tcp" // default: http
//     , "natives": []  // array of strings of raw config USE SPARINGLY!!
//     , "members" : [
//       {
//         // "name": "myapp",
//         // "version": "1.0.0",
//         "host": "192.168.1.184",
//         "port": 3000
//         // "lastKnown": 1378762056885,
//         // "meta": {
//         //     "hostname": "dev-use1b-pr-01-myapp-01x00x00-01",
//         //     "pid": 17941,
//         //     "registered": 1378740834616
//         // },
//         // "id": "/myapp/1.0.0/10.10.240.121/8080"
//       },
//       // {
//       //     // "name": "myapp",
//       //     // "version": "1.0.0",
//       //     "host": "192.168.1.184",
//       //     "port": 8002
//       //     // "lastKnown": 1378762060226,
//       //     // "meta": {
//       //     //     "hostname": "dev-use1b-pr-01-myapp-01x00x00-02",
//       //     //     "pid": 18020,
//       //     //     "registered": 1378762079883
//       //     // },
//       //     // "id": "/myapp/1.0.0/10.10.240.80/8080"
//       // }
        
//     ] // if type = dynamic this is dynamically populated based on role/version subscription
//     // otherwise expects { host: '10.10.10.10', port: 8080}
//   });

//   haproxy.putFrontend('www1', {
//     "bind": "*:10000" // IP and ports to bind to, comma separated, host may be *
//     , "backend": "backend1"      // the default backend to route to, it must be defined already
//     , "mode": "http"         // default: http, expects tcp|http
//     , "keepalive": "close"  // default: "default", expects default|close|server-close
//     , "rules": []           // array of rules, see next section
//     , "natives": []         // array of strings of raw config USE SPARINGLY!!
//   });



//   var r = haproxy.getBackends();
//   var f = haproxy.getFrontends();

//   log('BACKENDS-=-------------------:\n', util.inspect(r, { colors: true, depth:10 }));
//   log('FRONTENDS-=-------------------:\n', util.inspect(f, { colors: true, depth:10 }));

// }, 5000);
// test
// setInterval(function() {

//   log('CONFIG------------------------:\n', haproxy.getHaproxyConfig());
// },3000);
