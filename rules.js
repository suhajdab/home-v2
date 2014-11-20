/**
 * RULES
 */
var objectAssign = require( 'object-assign' );
var redis = require( 'redis' );
var kue = require( 'kue' ),
	events = kue.createQueue({prefix:'home'});

// TODO: keep system state in db
var state = {};

var rules = [
	{
		conditions: { source: 'sunlight-phase', name: 'dawn' },
		action:     { device: 0,	  state: { on: false, transitiontime: 5 } }
	}, {
		conditions: { source: 'sunlight-phase', name: 'dusk'  },
		action:     { device: 0,	  state: { on: true, ct: 450, bri: 200, transitiontime: 5 }   }
	}, {
		conditions: { source: 'alarm',          id: 1  },
		action:     { device: 1,	  state: 'longFadeIn'   }
	}
];

function rightConditions ( conditions, data ) {
	for ( var key in conditions ) {
		if ( data[ key ] != conditions[ key ]) return false;
	}
	return true;
}

function takeAction ( action, done, priority ) {
	console.log( 'takeAction', action );
	events.create( 'action', {
		state: action.state,
		device: action.device,
		title: 'Setting ' + action.device + ' to ' + action.state
	} ).priority( priority ).save();
	done();
}

function onEvent( event, done ) {
	var data = event.data;

	console.log( 'onEvent', event, data );
	for ( var i = 0, rule; rule = rules[ i ]; i++ ) {
		if ( rightConditions( rule.conditions, data )) takeAction( rule.action, done, data._priority );
	}

}

events.process( 'event', onEvent );