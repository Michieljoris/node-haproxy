var logLevel = 'debug';

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

function getUuid() {
  return 'xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, function(c) {
    return (Math.random()*16|0).toString(16);
  });
}

var response;
var infoFunctions = ['getHaproxyConfig', 'getFrontend', 'getBackend', 'getBackendMembers', 'getFrontends', 'getBackends'];

function ipc(api) {
  var ipc=require('node-ipc');

  ipc.config.id   = 'haproxy';
  ipc.config.retry= 1500;
  ipc.config.silent = true;

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
            };
            if (!api[data.call]) {
              error = "No such function: " + data.call;
              response(error);
            }
            else {
              result = api[data.call].apply(null, data.args);
            }
            if (infoFunctions.indexOf(data.call) !== -1) {
              response();
            }
            else {
              setTimeout(function() {
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
    var id = data.frontendId(key);
    obj.key = key;
    obj.uuid = getUuid(); //to mark it as changed..
    data.setFrontend(obj);
  };

  api.putBackend = function (key, obj) {
    var id = data.backendId(key);
    obj.key = key;
    obj.uuid = getUuid(); //to mark it as changed..
    if (obj.health && obj.health.httpVersion === 'http/1.1' && !obj.host) {
      throw Error('host is required with health check with httpversion=http/1.1');
    }
    data.setBackend(obj);
  };

  api.deleteFrontend = function (key) {
    var id = data.frontendId(key);
    var row = data.frontends.get(id);
    if (!row) throw Error('frontend ' + key + ' not found');
    data.frontends.rm(id);
  };

  api.deleteBackend = function (key) {
    var id = data.backendId(key);
    var row = data.backends.get(id);
    if (!row) throw Error('backend ' + key + ' not found');
    data.backends.rm(id);
  };

  api.updateBackend = function (key, obj) {
    var id = data.backendId(key);
    var row = data.backends.get(id);
    if (!row) throw Error('backend ' + key + ' not found');
    var backend = extend(true, {}, row.toJSON());
    backend.version = obj.version;
    backend.uuid = getUuid(); //to mark it as changed..
    if (obj.name) backend.name = obj.name;
    data.setBackend(backend);
  };

  api.getHaproxyConfig = function () {
    return haproxyManager.latestConfig;
    };

  return api;
};


// module.exports({ ipc: true });
