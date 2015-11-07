'use strict';
var kue = require( 'kue' ),
	events = kue.createQueue( { prefix: 'home' } ),
	verisureApi;

function ready() {
	verisureApi.on( 'alarmChange', function( data ) {
		console.log( 'on alarmStatus', data );
		events.create( 'event', {
			id: 'made-up-id',
			status: data.status,
			title: 'verisure alarm: ' + data.status,
			source: 'verisure:alarm'
		} ).save();
	} );
	console.log( 'verisure ready.' );
}

function init( globalSettings, platformSettings ) {
	var username = platformSettings.get( 'username' ),
		password = platformSettings.get( 'password' );

	verisureApi = require( 'verisure-api' ).setup( {
		username: username,
		password: password
	} );
	ready();
}

module.exports.init = init;
