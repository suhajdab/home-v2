/**
 * RULES
 */

require( 'es6-promise' ).polyfill();
var uuid = require( 'node-uuid' );
var objectAssign = require( 'object-assign' );
var db = require( './database-layer.js' );
var kue = require( 'kue' ),
	events = kue.createQueue({ prefix:'home' });

// TODO: keep system state in db??
var state = {};

var rules = [];

function rightConditions ( conditions, data ) {
	for ( var i = 0, condition; condition = conditions[ i ]; i++ ) {
		for ( var key in condition ) {
			if ( data[ key ] != condition[ key ]) return false;
		}
	}
	return true;
}

function takeAction ( rule, done ) {
	console.log( 'takeAction', arguments );
	events.create( 'action', {
		deviceSelector: rule.deviceSelector,
		service       : rule.service,
		params        : rule.params,
		title         : 'Setting ' + rule.deviceSelector + ' to ' + rule.service
	} ).save();
}

function onEvent( event, done ) {
	var data = event.data;

	console.log( 'onEvent', data );
	for ( var i = 0, rule; rule = rules[ i ]; i++ ) {
		if ( rightConditions( rule.conditions, data )) takeAction( rule );
	}

	done();
}

function ready() {
	events.process( 'event', onEvent );
	console.log( 'rules.js', 'ready', JSON.stringify( rules, null, "\t"));
//	takeAction({deviceSelector:'zone:garden', service: 'off'});


//	create( [{ source: 'verisure:alarm', status: 'armed' }], 'zone:house', 'off' );
//	create( [{ source: 'sun-phase', state: 'dusk' }], 'zone:garden', 'on' );
//	create( [{ source: 'sun-phase', state: 'dawn' }], 'zone:garden', 'off' );
}

function init () {
	db.get( 'rules' )
		.then( function ( data ) { rules = data || []; } )
		.catch( console.error.bind(console))
		.then( ready );

}

/* PUBLIC */
function create ( conditions, deviceSelector, service, params ) {
	var rule = {
		conditions    : conditions,
		deviceSelector: deviceSelector,
		service       : service,
		params        : params
	};
	rule.id = uuid.v4();
	rules.push( rule );
	db.set( 'rules', rules );
	console.log( 'rules.js', 'new rule create', rule );
	return rule.id;
}

function enable ( rule ) {
	rule.enabled = true;
}

function disable ( rule ) {
	rule.enabled = false;
}

init();