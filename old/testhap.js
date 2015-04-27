require('logthis').config({ _on: true,
                            'Data': 'debug' ,
                            'HaproxyManager': 'debug' ,
                            'HaproxyStats': 'debug',
                            'Db': 'debug',
                            'haproxy': 'debug'
                          });

var log = require('logthis').logger._create('haproxy');
  
var Haproxy = require('haproxy');
var resolve = require('path').resolve;
  
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

log('hello', defaults);


var opts = defaults;
var haproxy = new Haproxy(opts.haproxySocketPath, {
    config:  resolve(opts.haproxyCfgPath),
    pidFile: resolve(opts.haproxyPidPath),
    prefix: (opts.sudo) ? 'sudo' : undefined,
    which: __dirname + '/bin/haproxy'
});

haproxy.stop(function(err) {
    haproxy.start(function(err) {
        log(err);
        haproxy.running(function(err, running) {
            log('running:', err, running);
        });

        haproxy.stat('-1', '-1', '-1', function (err, stats) {

    
        });
    });
});

