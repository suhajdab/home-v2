/**
 * TIME
 */

// TODO: subscribe to location update
// home sweet home
var lat = 55.633701,
	long = 13.505829;


var kue = require('kue' ),
	events = kue.createQueue({prefix:'home'});

//  calculate sun phases based on day & loc
var suncalc = require( 'suncalc' );
var sunlight_phases = suncalc.getTimes( Date.now(), lat, long );

function checkEvents( now ) {
	for ( phase in sunlight_phases ) {
		if ( now <= sunlight_phases[ phase ] && sunlight_phases[ phase ] < ( now + 1000 ) ) {
			console.log( { phase : phase, time: Date.now() } );
			triggerEvent( phase );
		}
	}
}

function triggerEvent( data ) {
	events.create( 'event', {
		name: data,
		title: data + ' triggered',
		source: 'astro'
	}).save();
}

function tick () {
	var now = Date.now();
	checkEvents( now );
}

setInterval( tick, 1000 );