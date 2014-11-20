/**
 * ALARM
 */


var kue = require('kue' ),
	events = kue.createQueue({prefix:'home'});

// TODO: alarms to db, epxose to api
// TODO: use GUID
var alarms = [{
	id: 1,
	name: "Hubby's weekday sunrise",
	time: '08:12:00',
	days: [0,1,2,3,4],
	repeat: true,
	active: true
}];


function checkAlarms( now ) {
	for ( var i = 0, alarm; alarm = alarms[ i ]; i++ ) {
		if ( !alarm.active ) continue;
		// does alarm have days define
		if ( alarm.days.length > 0 ) {
			// check if weekday is in alarm
			if ( alarm.days.indexOf( now.getDay()) == -1 ) continue;
		}
		var timeArr = alarm.time.split( ':' );
		if ( now.getHours() == timeArr[ 0 ] && now.getMinutes() == timeArr[ 1 ] && now.getSeconds() == timeArr[ 2 ] ) triggerAlarm( alarm );
		if ( !alarm.repeat ) alarm.active = false;
	}
}

function triggerAlarm( data ) {
	console.log( 'alarm triggered', data );
	events.create( 'event', {
		id: data.id,
		name: data.name,
		state: data.active,
		title: data.name + ' triggered',
		source: 'alarm'
	}).priority('high' ).attempts(5).save();
}

function tick () {
	var now = new Date();
	checkAlarms( now );
}

setInterval( tick, 1000 );
