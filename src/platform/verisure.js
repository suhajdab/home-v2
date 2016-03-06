'use strict';

var verisureApi, emitter;
var deepFreeze = require('deep-freeze');

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

function ready() {
	verisureApi.on( 'alarmChange', function( data ) {
		emitter.emit( {
			nativeId: 'made-up-id',
			eventType: 'alarmChange',
			status: data.status,
			type: 'alarm'
		} );
	} );
	console.log( 'verisure ready.' );
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
