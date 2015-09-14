/*jshint node: true*/
var spark = require( 'spark' );
require( 'es6-promise' ).polyfill();

/**
 * Gets a variable value for the device
 * device.getVariable('temp').then()
 */
//TODO: create device object to pass back to devices.js
//TODO: events to listeners

function onGotEvent() {
	//console.log( 'Event: ' + JSON.stringify( data ));
	console.log( arguments );
}

function onLogin( err, body ) {
	if ( err ) {
		console.error( 'spark.js login error:', err );
	} else {
		console.log( 'spark.js login successful:', body );
		//spark.getEventStream( false, 'mine', onGotEvent );
		spark.listDevices( console.log.bind( console ) );
	}
}

function init( globalSettings, platformSettings ) {
	'use strict';

	var username = platformSettings.get( 'username' ),
		password = platformSettings.get( 'password' );

	spark.login( { username: username, password: password }, onLogin );
}

module.exports.init = init;

init();
