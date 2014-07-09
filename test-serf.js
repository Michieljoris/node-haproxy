var SerfRPC = require("serf-rpc");
var serf = new SerfRPC();

serf.connect(function(err){
    if(err)
        throw err;

    serf.event({"Name": "deploy", "Payload": "4f33de567283e4a456539b8dc493ae8a853a93f6", "Coalesce": false}, function(err, response){
        if(err)
            throw err;
        else
            console.log("Triggered the event!");
    });
    serf.join({"Existing": ["172.17.0.125"], "Replay": false}, function(err, res) {
	if(err)
	    throw err;
	else
            console.log("joined");
    
        
        serf["members-filtered"]({ Name: "hap.*" }, function(err, res) {
	    if(err)
	        throw err;
	    else
                console.log("Members\n", res);
    
        });
        
    });
});
