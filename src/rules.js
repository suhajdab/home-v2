/**
 * RULES
 */

require( 'es6-promise' ).polyfill();
var uuid = require( 'node-uuid' ),
	objectAssign = require( 'object-assign' ),
	dnode = require( 'dnode' ),

	rulesDB = require( './database-layer.js' )( 'rules', 'id' ),
	eventsDB = require( './database-layer.js' )( 'events', 'id' ),

	devicesApi,
	rules = [];

// TODO: multiple conditions

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
	console.log( 'rules.js', 'ready', JSON.stringify( rules, null, '\t' ) );
//	takeAction({deviceSelector:'zone:garden', service: 'off'});

//	create( [{ source: 'verisure:alarm', status: 'armed' }], 'zone:house', 'off' );
//	create( [{ source: 'sun-phase', state: 'dusk' }], 'zone:garden', 'on' );
//	create( [{ source: 'sun-phase', state: 'dawn' }], 'zone:garden', 'off' );

	devicesApi = dnode.connect( 8787 );
	devicesApi.on( 'remote', function( remote ) {
		remote.getPlatforms( function( platforms ) {
			console.log( JSON.stringify( platforms ) );
		} );
	} );
}

function init() {
	rulesDB.get( 'rules' )
		.then( function( data ) {
			rules = data || [];
		} )
		.catch( console.error.bind( console ) )
		.then( ready );

}

/* PUBLIC */
function createTimer( conditions, deviceSelector, service, params ) {
	var rule = {
		conditions: conditions,
		deviceSelector: deviceSelector,
		service: service,
		params: params
	};
	rule.id = uuid.v4();
	rules.push( rule );
	rulesDB.set( 'rules', rules );
	console.log( 'rules.js', 'new rule create', rule );
	return rule.id;
}

function enable( rule ) {
	rule.enabled = true;
}

function disable( rule ) {
	rule.enabled = false;
}

init();
