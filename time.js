/**
 * TIME
 */

// TODO: subscribe to location update
// home sweet home
var lat = 55.633701,
	long = 13.505829;


var kue = require('kue' ),
	events = kue.createQueue({prefix:'home'});

// TODO: alarms to db, epxose to api
var alarms = [{
	name: "Hubby's weekday alarm",
	time: '06:30',
	days: [0,1,2,3,4],
	repeat: true
}];

//  calculate sun phases based on day & loc
var suncalc = require( 'suncalc' );
var sunlight_phases = suncalc.getTimes( Date.now(), lat, long );



function triggerEvent( data ) {
	events.create( 'event', {
		name: data,
		title: data + ' triggered at ' + sunlight_phases[ data ],
		source: 'sun-phase'
	}).save();
}

function triggerAlarm( data ) {

}

function tick () {
	var now = Date.now();
	for ( phase in sunlight_phases ) {
		if ( now <= sunlight_phases[ phase ] && sunlight_phases[ phase ] < ( now + 1000 ) ) {
			console.log( { phase : phase, time: Date.now() } );
			triggerEvent( phase );
		}
	}
}

setInterval( tick, 1000 );

setTimeout( function() {
	triggerEvent( 'dusk' );
}, 5000 );