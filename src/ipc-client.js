var ipc = require('node-ipc');
var util = require('util');

ipc.config.id = 'haproxy-client';
ipc.config.retry = 1000;
ipc.config.silent = true;

module.exports = function(call, args, callback) {
  ipc.connectTo(
    'haproxy',
    function(){
      ipc.of.haproxy.on(
        'connect',
        function(){
          console.log('Sending message to haproxy');
          ipc.of.haproxy.emit(
            'api',
            {
              id : ipc.config.id,
              call : call,
              args: args
            }
          );
        }
      );
      ipc.of.haproxy.on(
        'disconnect',
        function(){
          console.log('disconnected from haproxy'.notice);
        }
      );
      ipc.of.haproxy.on(
        'result',
        function(result){
          if (result.error) callback(result.error, null);
          else callback(null, result.data);
          // console.log('got a message from haproxy : ', util.inspect(result, {depth: 10, colors: true }));
          ipc.config.maxRetries = 0;
          ipc.disconnect('haproxy');
        }
      );
    }
  );
};

// test
// module.exports('getFrontends', [], function(error, result) {
//   console.log(error, result);
// });
