'use strict';

var debug = require( 'debug' )( 'netatmo' );
var deepFreeze = require('deep-freeze');
var nativeId = 'verisure-madeup-id', // unlikely anyone would have 2 verisure alarms in the same system
	verisureApi, emitter;

const signature = {
	events: {
		alarmChange: {
			type: 'string',
			enum: [ 'unarmed', 'armedaway', 'armedhome', 'pending' ]
		}
	},
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

deepFreeze( signature );

function onAlarmChange( data ) {
	debug( 'onAlarmChange', data );
	emitter.emit( {
		name: 'change',
		nativeId: nativeId,
		payload: {
			eventType: 'alarmChange',
			status: data.status
		}
	} );
}

function ready() {
	verisureApi.on( 'alarmChange', onAlarmChange );

	emitter.emit( {
		name: 'device found',
		nativeId: nativeId,
		payload: {
			type: 'alarm',
			tag: [ 'zone:indoor' ]
		}
	} );

	debug( 'verisure ready.' );
}

function init( globalSettings, platformSettings, em ) {
	emitter = em;

	verisureApi = require( 'verisure-api' ).setup( {
		username: platformSettings.username,
		password: platformSettings.password
	} );
	ready();
}

module.exports = {
	init: init,
	signature: signature
};
