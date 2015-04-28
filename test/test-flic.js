var flic = require('flic');
var Node = flic.node;


var node = new Node(function(err){
  if (err)  {
    console.log(err);
    return;
  }
  console.log('client is online!');

  node.tell('haproxy:call', 'getBackends', null, null, function(err, result){
    if (err)  return console.log(err);
    console.log(result); 

  });
    node.tell('haproxy:call', 'getFrontends', null, null, function(err, result){
      if (err)  return console.log(err);
      console.log(result); 
    });
});
 

//From api.js
// function flic(api, port) {
//   var flic = require('flic');
//   var Bridge = flic.bridge;
//   var Node = flic.node;
 
//   // Default port is 8221 
//   port = typeof port === 'number' ? port : 8221;

//   // Bridge can be in any process, and nodes can be in any process 
//   var bridge = new Bridge();
//   // var bridge = new Bridge(port); //not working???
 
//   var node = new Node('haproxy', function(err){
//     if (err)  log._e(err);
//     else log._i('node-haproxy is online!');
//   });

//   node.on('call', function(fn, param1, param2,  callback){
//     console.log(fn, param1, param2); 
//     if (api[fn]) callback(null, api[fn](param1, param2));
//     else callback('No such function: ' + fn, null);
//   });
 
// }



