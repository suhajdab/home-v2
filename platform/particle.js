/*jshint node: true*/
var spark = require( 'spark' );
require( 'es6-promise' ).polyfill();

/**
 * Gets a variable value for the device
 * device.getVariable('temp').then()
 */
//TODO: create device object to pass back to devices.js
//TODO: events to listeners

/**
 * Function parses response from lifx's cloud api
 * @param {Object} data  raw json response from api
 * @returns {Promise}
 */
function parseDevices( err, data ) {
	var newObj = data.map( function ( obj ) {
		obj = obj.attributes;
		return {
			nativeId: obj.id,
			label: obj.name,
			type: 'microcontroller',
			platform: 'particle' // TODO: remove hardcoded platform
		};
	} );
//	return Promise.resolve( newObj );
	console.log(newObj);
}

function onGotEvent() {
	//console.log( 'Event: ' + JSON.stringify( data ));
	console.log( arguments );
}

function onLogin( err, body ) {
	if ( err ) {
		console.error( 'particle.js login error:', err );
	} else {
		console.log( 'particle.js login successful' );
		spark.getEventStream( false, 'mine', onGotEvent );
		spark.listDevices( parseDevices );
	}
}

function init( globalSettings, platformSettings ) {
	'use strict';

	var username = platformSettings.get( 'username' ),
		password = platformSettings.get( 'password' );

	spark.login( { username: username, password: password }, onLogin );
}

module.exports.init = init;
