/**
 * TIME
 */

// TODO: subscribe to location update
var suncalc = require( 'suncalc' );

var kue = require('kue' ),
	events = kue.createQueue();


// home sweet home
var lat = 55.633701,
	long = 13.505829;

var sunlight_phases = suncalc.getTimes( Date.now(), lat, long );

/*var event = events.create('email', {
	title: 'welcome email for tj'
	, to: 'tj@learnboost.com'
	, template: 'welcome-email'
}).save( function(err){
	if( !err ) console.log( event.id );
});*/

console.log( sunlight_phases );

function tick () {
	var now = Date.now();
	for ( phase in sunlight_phases ) {
		if ( now <= sunlight_phases[ phase ] && sunlight_phases[ phase ] < ( now + 1000 ) ) {
			//bus.publish( 'time.sunphase', { phase : phase, time: Date.now() });
			console.log( { phase : phase, time: Date.now() } );

			events.create( 'event', {
				title: phase,
				source: 'timer',
				time: sunlight_phases[ phase ].getTime()
			}).save();
		}
	}
}

setInterval( tick, 1000 );