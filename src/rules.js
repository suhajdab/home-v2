/**
 * RULES
 */

require( 'es6-promise' ).polyfill();
var debug = require( 'debug' )( 'rules' );
var uuid = require( 'node-uuid' ),
	objectAssign = require( 'object-assign' ),
	dnode = require( 'dnode' ),

	rulesDB = require( './database-layer.js' )( 'rules', 'id' ),
	eventsDB = require( './database-layer.js' )( 'events', 'id' ),

	devicesApi,
	rules = [];

// TODO: multiple conditions
// db query to find last entry with certain attributes: r.db('home').table('events').orderBy(r.desc('timeStamp')).filter({color:{brightness:92}}).limit(1)

function validateConditions( data ) {
	for ( var i = 0, rule; ( rule = rules[ i ] ); i++ ) {
		if ( rightConditions( rule.conditions, data ) ) takeAction( rule );

	}
}

function rightConditions( conditions, data ) {
	for ( var i = 0, condition; ( condition = conditions[ i ] ); i++ ) {
		for ( var key in condition ) {
			if ( data[ key ] != condition[ key ] ) return false;
		}
	}
	return true;
}

function takeAction( rule ) {
	console.log( 'takeAction', arguments );
	events.create( 'action', {
		deviceSelector: rule.deviceSelector,
		command: rule.command,
		params: rule.params,
		title: 'Setting ' + rule.deviceSelector + ' to ' + rule.service
	} );
	console.log( 'taking action from rule', rule );
}

function onChanges( err, cursor ) {
//	var data = event.data;
	cursor.map( function( change ) {
		return change.new_val;
	} ).each( validateConditions );
}

function ready() {
//	eventsDB.subscribe( onChanges );
	debug( 'ready', JSON.stringify( rules, null, '\t' ) );
//	takeAction({deviceSelector:'zone:garden', service: 'off'});

//	create( [{ source: 'verisure:alarm', status: 'armed' }], 'zone:house', 'off' );
//	create( [{ source: 'sun-phase', state: 'dusk' }], 'zone:garden', 'on' );
//	create( [{ source: 'sun-phase', state: 'dawn' }], 'zone:garden', 'off' );
}

function init() {
	rulesDB.get( 'rules' )
		.then( function( data ) {
			rules = data || [];
		} )
		.then( ready )
		.catch( console.error.bind( console ) );

	debug( 'init' );
}

/* PUBLIC */
/**
 *
 * @param conditions
 * @param action
 * @returns {*}
 */
function createRule( conditions, action ) {
	var rule = {
		conditions: conditions,
		action: action
	};
	rule.id = uuid.v4();
	rules.push( rule );
	rulesDB.set( 'rules', rules );
	debug( 'createRule', rule );
	return rule.id;
}

function enable( rule ) {
	rule.enabled = true;
}

function disable( rule ) {
	rule.enabled = false;
}

init();
