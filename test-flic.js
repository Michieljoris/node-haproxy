var flic = require('flic');
var Node = flic.node;


var node = new Node(function(err){
  if (err)  {
    console.log(err);
    return;
  }
  console.log('client is online!');

  node.tell('haproxy:call', 'getBackends', null, null, function(err, result){
    if (err)  console.log(err);
    else console.log(result); 
  });
});
 


// setTimeout(function() {
//   node.tell('haproxy:call', 'getBackends', null, null, function(err, result){
//     if (err)  console.log(err);
//     else console.log(result); 
//   });
// },1000);




