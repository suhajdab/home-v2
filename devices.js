require( 'es6-promise' ).polyfill();
var uuid = require('node-uuid');
var kue = require( 'kue' ),
	events = kue.createQueue({prefix:'home'});

var db = require( './database-layer.js' );


/* PRIVATE */
var providers = {}; // should come from redis
var devices = [],
	rooms = [],
	zones = [];

// TODO: discover new devices

/**
 * Read new room and zone tags, and store unique in db
 * @param {Array} tags
 */
function importTags ( tags ) {
	tags.forEach( function ( tag ) {
		var arr = tag.split( ':' );
		if ( arr.length < 2 ) return;
		if ( arr[ 0 ] == 'room' && !~rooms.indexOf( arr[ 1 ] )) rooms.push( arr[ 1 ]);
		if ( arr[ 0 ] == 'zone' && !~zones.indexOf( arr[ 1 ] )) zones.push( arr[ 1 ]);
	});
	db.set( 'rooms', rooms );
	db.set( 'zones', zones );
}

function findDeviceByTag ( selector ) {
	return devices.filter( function ( device ) {
		return ~( device.tags || [] ).indexOf( selector );
	});
}

function findDeviceById( id ) {
	for ( var i = 0, device; device = devices[ i ]; i++ ) {
		if ( device.id === id ) return device;
	}
	return false;
}

function deviceSelector ( selector ) {
	if ( ~selector.indexOf( ':') ) {
		return findDeviceByTag( selector );
	}
	else return findDeviceById( selector );
}

function registerNewDevice ( device ) {
	// add home specific id to device
	device.id = uuid.v4();
	devices.push( device );
	db.set( 'devices', devices );
	if ( device.tags ) importTags ( device.tags );
}

function filterOutRegisteredDevices ( device ) {
	for ( d in devices ) {
		if ( devices[ d ].nativeId == device.nativeId && devices[ d ].provider == device.provider ) return false;
	}

	return true;
}

function registerNewDevices( deviceList ) {
	deviceList.filter( filterOutRegisteredDevices ).forEach( registerNewDevice );
}

function onRegistrationError ( err ) {
	console.error( err ); // TODO: error logging
}

function registerProviders ( providers ) {
	providers.forEach( registerProvider );
}

function registerProvider ( providerName ) {
	if ( !!providers[ providerName ] ) return;
	providers[ providerName ] = require( './providers/' + providerName + '.js' );
	providers[ providerName ].getDevices().then( registerNewDevices ).catch( onRegistrationError );
}

function registerNewProvider ( provider ) {
	registerProvider( provider );
	db.set( 'providers', Object.keys( providers ));
}

function ready () {
	//console.log( 'device.js ready', devices );
	events.process( 'action', onAction );
}

function init () {
	Promise.all([
		db.get( 'providers' ).then( registerProviders ),
		db.get( 'devices' ).then( function ( data ) { devices = data; } ),
		db.get( 'zones' ).then( function ( data ) { zones = data; } ),
		db.get( 'rooms' ).then( function ( data ) { rooms = data; } )
	]).then( ready );
}


function onAction( event, done ) {
	// TODO: untangle devices, tags and standardize statuses
	var data = event.data;

	console.log( 'onAction', event, data );

}


init();