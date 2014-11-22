/**
 * HOME - bus
 */

// TODO: abstract away queuing mechanism
// TODO: error logging to db
var kue = require('kue' ),
	events = kue.createQueue({prefix:'home'});

// TODO: move devices & states to db

var debug = true;

function log () {
	if ( debug ) console.log( arguments );
}



/*
 var uuid = require('node-uuid');
 Devices should get ids ...

 // Generate a v1 (time-based) id
 uuid.v1(); // -> '6c84fb90-12c4-11e1-840d-7b25c5ee775a'
 */

var devices = [
	{ prod: 'hue',  id: 1,  name: 'terrace lamp' },
	{ prod: 'lifx',  id: 1, name: 'Hubby\'s bedside' },
	{ prod: 'lifx',  id: 2, name: "Island lamp" },
	{ prod: 'lifx',  id: 3, name: "Dining lamp" }
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