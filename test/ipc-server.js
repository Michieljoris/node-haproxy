var ipc=require('node-ipc');

ipc.config.id   = 'haproxy';
ipc.config.retry= 1500;
ipc.config.silent = true;

ipc.serve(
  function(){
    ipc.server.on(
      'api',
      function(data,socket){
        console.log(data);
        //ipc.log('got a message from'.debug, (data.id).variable, (data.message).data);
        ipc.server.emit(
          socket,
          'result',
          {
            id      : ipc.config.id,
            data : data
          }
        );
      }
    );
  }
);

// ipc.server.define.listen['app.message']='This event type listens for message strings as value of data key.';

ipc.server.start();
