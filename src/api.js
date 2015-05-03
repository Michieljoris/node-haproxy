var logLevel = 'info';

require('logthis').config({ _on: true,
                            'Data': logLevel ,
                            'HaproxyManager': logLevel ,
                            'HaproxyStats': logLevel,
                            'Db': logLevel,
                            'api': logLevel
                          });

var log = require('logthis').logger._create('api');

var assert = require('assert')
, resolve = require('path').resolve
, Haproxy = require('haproxy')
, Data = require('../src/Data')
, Db = require('../src/Db')
, HaproxyManager = require('../src/HaproxyManager')
, HaproxyStats = require('../src/HaproxyStats')
, extend = require('extend')
, Path = require('path')
, fs = require('fs-extra')
, util = require('util');

var tempDir = Path.join(__dirname, '../temp');

fs.ensureDirSync(tempDir);
                 
var firstStart = true;

var defaults = {
  //Alternative configuration:

  //     haproxySocketPath: '/tmp/haproxy.status.sock',
  //     haproxyPidPath: '/var/run/haproxy.pid',
  //     haproxyCfgPath: '/etc/haproxy/haproxy.cfg',
  //     sudo: 'use sudo when starting haproxy',

  haproxySocketPath: Path.join(tempDir, 'haproxy.status.sock'),
  haproxyPidPath: Path.join(tempDir, 'haproxy.pid'),
  haproxyCfgPath: Path.join(tempDir, 'haproxy.cfg'),

  templateFile: Path.join(__dirname, '../haproxycfg.tmpl'),
  persistence: Path.join(tempDir, 'persisted'),
  dbPath:  Path.join(tempDir, 'db'),
  which: Path.join(__dirname, '../haproxy'), //if undefined tries to find haproxy on system 
  ipc: false //whether to enable the ipc server
};

var PACKAGEJSON = Path.resolve(__dirname,  '../package.json');

function getUuid() {
  return 'xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, function(c) {
    return (Math.random()*16|0).toString(16);
  });
}

var response;
var infoFunctions = ['getHaproxyConfig', 'getFrontend', 'getBackend', 'getBackendMembers', 'getFrontends', 'getBackends'];

function version() {
  var packageJson = fs.readJsonSync(PACKAGEJSON);
  return packageJson.version;
}

function ipc(api) {

  var ipc=require('node-ipc');

  ipc.config.id   = 'haproxy';
  ipc.config.retry= 1500;
  ipc.config.silent = true;
  var timeoutId;
  ipc.serve(
    function(){
      ipc.server.on(
        'api',
        function(data,socket){
          console.log(data.call);
          var error, result;
          if (response) {
            ipc.server.emit(
              socket,
              data.uuid,
              {
                id   : ipc.config.id,
                error: "Call in progress.."
              }
            );
          }
          else {
            response = function(error) {
              ipc.server.emit(
                socket,
                data.uuid,
                {
                  id   : ipc.config.id,
                  data : result,
                  error: error
                }
              );
              response = null;
              clearTimeout(timeoutId);
            };
            if (!api[data.call]) {
              error = "No such function: " + data.call;
              response(error);
            }
            else {
              data.args = data.args || [];
              data.args = Array.isArray(data.args) ? data.args : [data.args];
              result = api[data.call].apply(null, data.args || []);
            }
            if (infoFunctions.indexOf(data.call) !== -1) {
              response();
            }
            else {
              timeoutId = setTimeout(function() {
                if (response) response('timout');
              }, 10000);

            }
          }
        }
      );
    }
  );

  ipc.server.start();
  console.log('ipc server started');
}


module.exports =  function(opts) {
  console.log('Version:', version());
  var data, haproxyManager;
  opts = extend(defaults, opts);
  if (opts.which === 'system') delete opts.which;
    
  data = new Data( {
    persistence: opts.persistence, //file location
    log: log
  });

  var haproxy = new Haproxy(opts.haproxySocketPath, {
    config:  resolve(opts.haproxyCfgPath),
    pidFile: resolve(opts.haproxyPidPath),
    prefix: (opts.sudo) ? 'sudo' : undefined,
    which: opts.which
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
    db.writeActivity({ type: 'activity',  time: Date.now(), verb: 'started'});
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

  haproxyManager.on('haproxy-error', function (error) {
    log._e('Haproxy error:\n', error);
    if (response) response(error);
  });

  haproxyManager.on('configNotChanged', function (statObj) {
    log._i('Config not changed');
    if (response) response();
  });

  // Wire up haproxy changes to write to activity db
  haproxyManager.on('configChanged', function (statObj) {
    var activityObj = { type: 'activity',  time: Date.now(), verb: 'haproxyConfigChanged'};
    log('configChanged\n', activityObj);
    db.writeActivity(activityObj);
  });

  haproxyManager.on('reloaded', function (statObj) {
    var activityObj = { type: 'activity',  time: Date.now(), verb: 'haproxyRestarted' };
    log('reloaded\n', activityObj);
    if (firstStart) {
      console.log('Running..');
      firstStart = false;
      if (opts.ipc) ipc(api);
    }
    db.writeActivity(activityObj); 
    if (response) response();
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
    // var id = data.frontendId(key);
    obj.key = key;
    obj.uuid = getUuid(); //to mark it as changed..
    data.setFrontend(obj);
  };

  api.putFrontends = function(array) {
    array.forEach(function(e) {
      api.putFrontend(e.key, e.obj);
    });
  },

  api.putBackend = function (key, obj) {
    // var id = data.backendId(key);
    obj.key = key;
    obj.uuid = getUuid(); //to mark it as changed..
    if (obj.health && obj.health.httpVersion === 'http/1.1' && !obj.host) {
      throw Error('host is required with health check with httpversion=http/1.1');
    }
    data.setBackend(obj);
  };

  api.putBackends = function(array) {
    array.forEach(function(e) {
      api.putBackend(e.key, e.obj);
    });
  },

  api.deleteFrontend = function (key) {
    var id = data.frontendId(key);
    var row = data.frontends.get(id);
    if (row) data.frontends.rm(id);
    else if (response) response('Frontend not found: ' + key);
  };

  var deleteFrontends = function (keys) {
    var touched;
    keys.forEach(function(key) {
      var id = data.frontendId(key);
      var row = data.frontends.get(id);
      if (row) {
        data.frontends.rm(id);
        touched = true;
      }
    });
    return touched;
  };

  api.deleteFrontends = function(keys) {
    var touched = deleteFrontends(keys);
    if (!touched && response) response();
  },

  api.deleteBackend = function (key) {
    var id = data.backendId(key);
    var row = data.backends.get(id);
    if (row) data.backends.rm(id);
    else if (response) response();
  };

  var deleteBackends = function (keys) {
    var touched;
    keys.forEach(function(key) {
      var id = data.backendId(key);
      var row = data.backends.get(id);
      if (row) {
        data.backends.rm(id);
        touched = true;
      }
    });
    return touched;
  };

  api.deleteBackends = function(keys) {
    var touched = deleteBackends(keys);
    if (!touched && response) response();
  };

  // function inspect(arg) {
  //   return util.inspect(arg, { depth: 10, colors: true });
  // }
  
  // api.updateFrontend = function (key, obj) {
  //   var id = data.frontendId(key);
  //   var row = data.frontends.get(id);
  //   var oldFrontend = {};
  //   obj = obj || {};
  //   if (row) {
  //     row = row.toJSON();
  //     oldFrontend = extend(true, {}, row); //deep copy row
  //   }
  //   console.log(inspect(oldFrontend));
  //   console.log(inspect(obj));
  //   var frontend = oldFrontend ? extend(true, oldFrontend, obj) : obj; 
  //   frontend.rules = obj.rules;
  //   frontend.uuid = getUuid(); //to mark it as changed..
  //   frontend.key = key;
  //   console.log(inspect(frontend));
  //   console.log(response);
  //   data.setFrontend(frontend);
  // };

  // api.updateBackend = function (key, obj) {
  //   var id = data.backendId(key);
  //   var row = data.backends.get(id);
  //   var oldBackend = {};;
  //   obj = obj || {};
  //   if (row) {
  //     row = row.toJSON();
  //     oldBackend = extend(true, {}, row); //deep copy row
  //     }
  //   var backend = oldBackend ? extend(true, oldBackend, obj) : obj; 
  //   backend.uuid = getUuid(); //to mark it as changed..
  //   backend.key = key;
  //   data.setBackend(backend);
  // };

  api.bulkSet = function(ops) {
    ops = ops || {};
    var touched;
    if (ops.delete) {
      if (ops.delete.backends) touched = touched || deleteBackends(ops.delete.backends);
      if (ops.delete.frontends) touched = touched || deleteFrontends(ops.delete.frontends);
    }
    if (ops.put) {
      if (ops.put.backends && ops.put.backends.length) {
        touched = true;
        api.putBackends(ops.put.backends);
      }
      if (ops.put.frontend) {
        touched = true;
        api.putFrontend(ops.put.frontend.key, ops.put.frontend.obj);
      }
    }
    if (!touched && response) response();
  },

  api.getHaproxyConfig = function () {
    return haproxyManager.latestConfig;
  };

  return api;
};

// module.exports({ ipc: true});
// console.log(process._arguments);
// console.log(extend(true, {a:1}, {a:2, b:2}));
// module.exports({ ipc: true });

// var p = fs.readJsonSync('/home/michieljoris/src/node-haproxy/temp/persisted');
// console.log(p);
