/*jshint node: true*/
var Spark = require('spark');
require( 'es6-promise' ).polyfill();

/**
* Gets a variable value for the device
* device.getVariable('temp').then()
*/




function init ( globalSettings, platformSettings ) {
    'use strict';
	var username = platformSettings.get( 'username' ),
		password = platformSettings.get( 'password' );

	Spark.login({ username: username, password: password }, function( err, body ) {
      console.log( 'API call login completed on callback:', body );
    });
}

module.exports.init = init;
