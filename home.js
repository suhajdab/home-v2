/**
 * HOME - bus
 */
var kue = require('kue' ),
	events = kue.createQueue({prefix:'home'});

// TODO: move devices & states to db

// tmp hue
var hue = require("node-hue-api"),
	HueApi = hue.HueApi,
	lightState = hue.lightState;

var displayResult = function(result) {
	console.log(JSON.stringify(result, null, 2));
};

var displayError = function(err) {
	console.error(err);
};


//tmp lifx
var lifx = require('lifx');
var lx   = lifx.init();

lifx.setDebug(false);
function getBulbs() {
	bulbs = lx.bulbs.map( function ( bulb ) {
		return bulb.name;
	});
	console.log(bulbs);
}
getBulbs();
setTimeout(function() {
	//lx.lightsColour(hue,    saturation, luminance(0-64000), whiteColour (0-8xxx), fadeTime(ms), bulb);
	lx.lightsOn("Island lamp");
//	lx.lightsColour( 0x00, 0x00, 0x00, 0x00, 0, "Island lamp" );
	setTimeout( function () {
		lx.lightsColour( 0x00, 0x00, 65000, 0, 5*60*1000, "Island lamp" );
	}, 100 );
//	lx.sendToOne(packet.getLightState(), "Island lamp");
}, 2000);

var map = {
	hue: {
		'terrace lamp': [1],
		'tv strip': [4],
		'bloom': [5]
	},
	lifx: {
		'arabian': 'Arabian'
	}
};


var hostname = "10.0.1.2",
	username = "2b107172103c8c9f1e4ee403426a87f",
	api = new HueApi( hostname, username );
//
//state = lightState.create().on().white( 500, 0 ).transition(5).white( 500, 100 );
//console.log(state);

//api.setLightState( 1, { on: true, ct: 450, bri: 200, transitiontime: 5 });
//
//api.lights().then(displayResult).done();

function onAction( event, done ) {
	var data = event.data;
	console.log( data );
	// converters, processors //
	api.setLightState( data.device, data.state ).then( done ).done();
}

events.process( 'action', onAction );


/*
function toggle( callback, id ) {
	api.lightStatus(id, function(err, result) {
		if (err) throw err;
		//displayResult(result.state.on);
		api.setLightState(id, {'on': !result.state.on}, function(err, result) {
			if (err) throw err;
			callback(result);
		});
	});
}
*/