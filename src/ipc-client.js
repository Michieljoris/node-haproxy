var ipc = require('node-ipc');
var util = require('util');
var VOW = require('dougs_vow');

ipc.config.id = 'haproxy-client';
ipc.config.retry = 1000;
ipc.config.silent = true;

function getUuid() {
  return 'xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, function(c) {
    return (Math.random()*16|0).toString(16);
  });
}

var haproxy = function(call, args) {
  var vow = VOW.make();
  var uuid = getUuid();
  ipc.connectTo(
    'haproxy',
    function(){
      ipc.of.haproxy.emit(
        'api',
        {
          id : ipc.config.id,
          call : call,
          args: args,
          uuid: uuid 
        }
      );
      ipc.of.haproxy.on(
        'disconnect',
        function(){
          console.log('disconnected from haproxy'.notice);
          vow.break('node-haproxy is not running..');
        }
      );
      ipc.of.haproxy.on(
        uuid,
        function(result){
          if (result.error) vow.break(result.error); //callback(result.error, null);
          else vow.keep(result.data); //callback(null, result.data);
          // console.log('got a message from haproxy : ', util.inspect(result, {depth: 10, colors: true }));
        }
      );
    }
  );
  return vow.promise;
};

haproxy.close = function() {
  ipc.config.maxRetries = 0;
  ipc.disconnect('haproxy');
  
};

module.exports = haproxy;

// test
// module.exports('getFrontends', [], function(error, result) {
//   console.log(error, result);
// });
