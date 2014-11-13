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

var hostname = "10.0.1.2",
	username = "2b107172103c8c9f1e4ee403426a87f",
	api = new HueApi( hostname, username );


function getBulbs() {
	bulbs = lx.bulbs.map( function ( bulb ) {
		return bulb.name;
	});
	console.log(bulbs);
}
//getBulbs();

var devices = [
	{ prod: 'hue',  id: 1,  name: 'terrace lamp' },
	{ prod: 'lifx',  id: 1, name: "Hubby's bedside" }
//	{ prod: 'lifx',  id: 1, name: "Island lamp" }
];


//
//state = lightState.create().on().white( 500, 0 ).transition(5).white( 500, 100 );
//console.log(state);

//api.setLightState( 1, { on: true, ct: 450, bri: 200, transitiontime: 5 });
//
//api.lights().then(displayResult).done();

function lifxSunRise( device ){
	var duration = 30*60*1000;
	lx.lightsColour( 0x00, 0x00, 0x00, 0x00, 0, device.name );
	lx.lightsOn( device.name );
	setTimeout( function () {
		lx.lightsColour( 0x00, 0x00, 65000, 0, duration, device.name );
	}, 500 );
}

function onAction( event, done ) {
	var data = event.data,
		device = devices[ data.device ];

	console.log( 'onAction', device, data );
	// converters, processors //
	if ( device.prod == 'hue' ) api.setLightState( device.id, data.state ).then( done ).done();
	if ( device.prod == 'lifx' ) {
		lifxSunRise( device );
		done();
	}
}

events.process( 'action', onAction );