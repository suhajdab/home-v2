require( 'es6-promise' ).polyfill();
var uuid = require('node-uuid');

var db = require( './database-layer.js' );

//var hue = require('./wrappers/hue.js');
//var lx = require('./wrappers/lifx.js');


var providers = {}; // should come from redis
var devices = [];

// TODO: discover new devices

function registerDevice ( device ) {
	device.id = uuid.v1();
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

function onRegistrationError ( err ) {
	console.error( err ); // TODO: error logging
}

function registerProviders ( providers ) {
	providers.forEach( registerProvider );
}

function registerProvider ( providerName ) {
	if ( !!providers[ providerName ] ) return;
	providers[ providerName ] = require( './wrappers/' + providerName + '.js' );
	providers[ providerName ].getDevices().then( registerDevices ).catch( onRegistrationError );
}

function registerNewProvider ( provider ) {
	registerProvider( provider );
	db.set( 'providers', Object.keys( providers ));
}

function init () {
	db
		.get( 'providers' )
		.then( registerProviders );
}

init();