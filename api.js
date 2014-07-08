require('logthis').config({ _on: true,
                            'Data': 'debug' ,
                            'HaproxyManager': 'debug' ,
                            'HaproxyStats': 'debug',
                            'Db': 'debug',
                            'api': 'debug'
                          });

var log = require('logthis').logger._create('api');

var assert = require('assert')
  , resolve = require('path').resolve
  , Haproxy = require('haproxy')
  , Data = require('./src/Data')
  , Db = require('./src/Db')
  , HaproxyManager = require('./src/HaproxyManager')
  , HaproxyStats = require('./src/HaproxyStats')
  , extend = require('extend')
  ;

var defaults = {
    host: '0.0.0.0',
    port: 10000,
    // haproxySocketPath: '/tmp/haproxy.status.sock',
    // haproxyPidPath: '/var/run/haproxy.pid',
    // haproxyCfgPath: '/etc/haproxy/haproxy.cfg',
    haproxySocketPath: __dirname + '/haproxy.status.sock',
    haproxyPidPath: __dirname + '/haproxy.pid',
    haproxyCfgPath: __dirname + '/haproxy.cfg',
    templateFile: __dirname + '/default.haproxycfg.tmpl',
    persistence: __dirname + '/persisted',
    dbPath:  __dirname + '/db',
    // sudo: 'use sudo when starting haproxy'
    sudo: 'use sudo when starting haproxy'
};

log('hello');


module.exports = function(opts) {
    var data, haproxyManager;
    opts = extend(defaults, opts);
    
    data = new Data( {
        persistence: opts.persistence, //file location
        log: log
    });

    var haproxy = new Haproxy(opts.haproxySocketPath, {
        config:  resolve(opts.haproxyCfgPath),
        pidFile: resolve(opts.haproxyPidPath),
        prefix: (opts.sudo) ? 'sudo' : undefined
    });

    haproxyManager = new HaproxyManager({
        haproxy: haproxy,
        data: data,
        haproxyCfgPath: opts.haproxyCfgPath,

        templateFile: opts.templateFile,
        sudo: opts.sudo,
        log: log
    });

    var haproxyStats = new HaproxyStats({
        haproxy: haproxy,
        data: data,
        log: log
    });
    
    // Stream stats into a leveldb
    var db = new Db(opts, function () {
        db.writeActivity({ type: 'activity',  time: Date.now(), verb: 'started', object: '1234' });
    });

    // Wire up stats to write to stats db
    haproxyStats.on('stat', function (statObj) {
        db.writeStat(statObj);
    
        if (statObj.type === 'frontend') {
            data.setFrontendStat(statObj);
        }
        else if (statObj.type === 'backend') {
            data.setBackendStat(statObj);
        }
        else if (statObj.type === 'backendMember') {
            data.setBackendMemberStat(statObj);
        }
    });

    // Wire up haproxy changes to write to activity db
    haproxyManager.on('configChanged', function (statObj) {
        var activityObj = { type: 'activity',  time: Date.now(), verb: 'haproxyConfigChanged', object: '1234' };
        log('activity', activityObj);
        db.writeActivity(activityObj);
    });

    haproxyManager.on('reloaded', function (statObj) {
        var activityObj = { type: 'activity',  time: Date.now(), verb: 'haproxyRestarted', object: '1234' };
        log('activity', activityObj);
        db.writeActivity(activityObj); 
    });
    
    var api = {};

    api.getFrontend = function (key) {
        var id = data.frontendId(key);
        var row = data.frontends.get(id);
        return row ? row.toJSON() : null;
    };

    api.getBackend = function (key) {
        var id = data.backendId(key);
            var row = data.backends.get(id);
        return row ? row.toJSON() : null;
    };

    api.getBackendMembers = function (key) {
        var id = data.backendId(key);
        var row = data.backends.get(id);
        return row ?  row.toJSON().members : null;
    };

    api.getFrontends = function () {
        return data.frontends.toJSON();
    };

    api.getBackends = function () {
        return data.backends.toJSON();
    };

    api.putFrontend = function (key, obj) {
        var id = data.frontendId(key);
        obj.key = key;
        data.setFrontend(obj);
    };

    api.putBackend = function (key, obj) {
        var id = data.backendId(key);
        obj.key = key;
        if (obj.health && obj.health.httpVersion === 'http/1.1' && !obj.host) {
            throw Error('host is required with health check with httpversion=http/1.1');
        }
        data.setBackend(obj);
    };

    api.deleteFrontend = function (key) {
        var id = data.frontendId(key);
        var row = data.frontends.get(id);
        log('frontend ' + key + ' not found');
        data.frontends.rm(id);
    };

    api.deleteBackend = function (key) {
        var id = data.backendId(key);
        var row = data.backends.get(id);
        log('backend ' + key + ' not found');
        data.backends.rm(id);
    };

    api.postBackendSubscription = function (key, obj) {
        var id = data.backendId(key);
        var row = data.backends.get(id);
        if (!row) throw Error('backend ' + key + ' not found');
        var backend = extend(true, {}, row.toJSON());
        backend.version = obj.version;
        if (obj.name) backend.name = obj.name;
        data.setBackend(backend);
    };


    api.getHaproxyConfig = function () {
        return haproxyManager.latestConfig;
    };

    return api;
};

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

var haproxy = module.exports();
//test
haproxy.putBackend('backend1', {
    // "type" : "dynamic|static" 
    "type" : "static" 
    , "name" : "foo" // only required if type = dynamic
    , "version" : "1.0.0" // only required if type = dynamic
    // , "balance" : "roundrobin|source" // defaults to roundrobin
    , "host" : "myapp.com"  // default: undefined, if specified request to member will contain this host header
    , "health" : {                 // optional health check
        "method": "GET"            // HTTP method
        , "uri": "/checkity-check"   // URI to call
        , "httpVersion": "HTTP/1.1"  // HTTP/1.0 or HTTP/1.1 `host` required if HTTP/1.1
        , "interval": 5000           // period to check, milliseconds
    }
    // , "mode" : "http|tcp" // default: http
    , "natives": []  // array of strings of raw config USE SPARINGLY!!
    , "members" : [] // if type = dynamic this is dynamically populated based on role/version subscription
    // otherwise expects { host: '10.10.10.10', port: 8080}
});

haproxy.putFrontend('frontend1', {
    "bind": "0.0.0.0:10000" // IP and ports to bind to, comma separated, host may be *
  , "backend": "backend1"      // the default backend to route to, it must be defined already
  , "mode": "http"         // default: http, expects tcp|http
  , "keepalive": "close"  // default: "default", expects default|close|server-close
  , "rules": []           // array of rules, see next section
  , "natives": []         // array of strings of raw config USE SPARINGLY!!
});



var r = haproxy.getBackends();

log('BACKENDS-=-------------------:', r);
