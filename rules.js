/**
 * RULES
 */
var objectAssign = require( 'object-assign' );
var db = require( './database-layer.js' );
var kue = require( 'kue' ),
	events = kue.createQueue({prefix:'home'});

// TODO: keep system state in db??
var state = {};

var rules = [];

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

function init() {
	events.process( 'event', onEvent );
	db.get( 'rules' ).then( function ( data ) { rules = data; } ).then( console.log.bind(console));
}


init();