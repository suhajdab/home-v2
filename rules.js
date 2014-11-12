/**
 * RULES
 */

var redis = require( 'redis' );

var kue = require( 'kue' ),
	events = kue.createQueue({prefix:'home'});

var rules = [
	{
		conditions: { source: 'sun-phase',        name: 'dawn' },
		action:     { device: 'terrace lamp',	  state: { on: false, transitiontime: 5 } }
	}, 	{
		conditions: { source: 'sun-phase',        name: 'dusk'  },
		action:     { device: 'terrace lamp',	  state: { on: true, ct: 450, bri: 200, transitiontime: 5 }   }
	}
];

function rightConditions ( conditions, data ) {
	for ( var key in conditions ) {
		if ( data[ key ] != conditions[ key ]) return false;
	}
	return true;
}

function takeAction ( action, done ) {
	events.create( 'action', {
		state: action.state,
		device: action.device,
		title: 'Setting ' + action.device + ' to ' + action.state
	} ).save();
	done();
}

function onEvent( event, done ) {
	var data = event.data;
	console.log( 'onEvent', data );
	for ( var i = 0, rule; rule = rules[ i ]; i++ ) {
		if ( rightConditions( rule.conditions, data )) takeAction( rule.action, done );
	}

}

events.process( 'event', onEvent );