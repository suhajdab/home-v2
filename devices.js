require( 'es6-promise' ).polyfill();
var uuid = require('node-uuid');
var kue = require( 'kue' ),
	events = kue.createQueue({prefix:'home'});

var db = require( './database-layer.js' );


/* PRIVATE */
var providers = {}; // should come from redis
var devices = [];

// TODO: discover new devices
// TODO: create device tags=> room:kitchen / zone:garden / home:estate

function registerDevice ( device ) {
	devices.push( device );
}

function registerNewDevice ( device ) {
	// add home specific id to device
	device.id = uuid.v4();
	devices.push( device );
	db.set( 'devices', devices );
}

function filterOutRegisteredDevices ( device ) {
	for ( d in devices ) {
		if ( devices[ d ].nativeId == device.nativeId && devices[ d ].provider == device.provider ) return false;
	}

	return true;
}

function registerDevices( deviceList ) {
	deviceList.filter( filterOutRegisteredDevices ).forEach( registerDevice );
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
	providers[ providerName ] = require( './wrappers/' + providerName + '.js' );
	providers[ providerName ].getDevices().then( registerNewDevices ).catch( onRegistrationError );
}

function registerNewProvider ( provider ) {
	registerProvider( provider );
	db.set( 'providers', Object.keys( providers ));
}

function init () {
	db.get( 'devices' ).then( registerDevices );
	db.get( 'providers' ).then( registerProviders );

	events.process( 'action', onAction );
}


function onAction( event, done ) {
	// TODO: untangle devices, tags and standardize statuses
	var data = event.data;

	console.log( 'onAction', event, data );

}


init();