var optimist = require('optimist')
  .options({
    haproxySocketPath: {
      describe: 'path to Haproxy socket file'
    },
    haproxyPidPath: {
      describe: 'path to  Haproxy pid file'
    },
    haproxyCfgPath: {
      describe: 'generated Haproxy config location'
    },
    templateFile: {
      describe: 'template used to generate Haproxy config'
    },
    persistence: {
      describe: 'directory to save configuration'
    },
    dbPath: {
      describe: 'filesystem path for leveldb'
    },
    sudo: {
      describe: 'use sudo when starting haproxy'
    },
    which: {
      describe: 'path for haproxy, set to \'system\' to look for it, otherwise the included haproxy (v1.5) is used'},
    ipc: {
      describe: 'start up ipc server '
    },
    help: {
      alias: 'h'
    }
  });

var argv = optimist.argv;
if (argv.h) {
  optimist.showHelp();
  process.exit(0);
}

module.exports = argv;
