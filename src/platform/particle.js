'use strict';

var spark = require( 'spark' );
require( 'es6-promise' ).polyfill();

var deviceLabels = {},
	emitter,
	signature = {
		settings: {
			username: {
				type: 'string',
				label: 'username/e-mail',
				required: true
			},
			password: {
				type: 'string',
				label: 'password',
				required: true
			}
		}
	};

Object.freeze( signature );

// TODO: events should only trigger on changes
// TODO: values should be inside property object, ex: temp: {value: 22, units: 'C'}
// TODO: create special case for DIY devices to accept signature.events & commands as settings

/**
 * Function parses response from cloud api
 * @param {Object} data  raw json response from api
 * @returns {Promise}
 */
function parseDevices( err, data ) {
	data.forEach( function( obj ) {
		obj = obj.attributes;
		deviceLabels[ obj.id ] = obj.name;
	} );
	console.log( deviceLabels );
}

function parseEvent( eventData ) {
	console.log('parsing particle event', arguments);
	return {
		eventType: eventData.name,
		nativeId: eventData.coreid,
		label: deviceLabels[ eventData.coreid ],
		type: 'microcontroller',
		data: JSON.parse( eventData.data )
	};
}

function onGotEvent( event ) {
	emitter.emit( parseEvent( event ) );
//	console.log( arguments );
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

function init( globalSettings, platformSettings, em ) {
	emitter = em;
	spark.login( {
		username: platformSettings.username,
		password: platformSettings.password
	}, onLogin );
}

module.exports = {
	init: init,
	signature: signature
};
