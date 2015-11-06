/**
 * HOME - bus
 */

// TODO: abstract away queuing mechanism
// TODO: error logging to db
var kue = require( 'kue' ),
	events = kue.createQueue( { prefix: 'home' } );

var debug = true;

function log() {
	if ( debug ) console.log( arguments );
}

function lifxSunRise( device ) {
	var duration = 30 * 60 * 1000;
	// lx.lightsColour( 0x00, 0x00, 0x00, 0x00, 0, device.name );
	// lx.lightsOn( device.name );
	// setTimeout( function () {
	// 	lx.lightsColour( 0x00, 0x00, 65000, 0, duration, device.name );
	// }, 500 );
}

function onAction( event, done ) {
	// var data = event.data,
	// 	device = devices[ data.device ];
	//
	// console.log( 'onAction', device, data );
	// // converters, processors //
	// if ( device.prod == 'hue' ) api.setLightState( device.id, data.state ).then( done ).done();
	// if ( device.prod == 'lifx' ) {
	// 	lifxSunRise( device );
	// 	done();
	// }
}

// events.process( 'action', onAction );
