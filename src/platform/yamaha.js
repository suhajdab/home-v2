'use strict';

require( 'es6-promise' ).polyfill();

// TODO: support multiple amps

var YamahaAPI = require( 'yamaha-nodejs' ),
	yamaha;

var pollDelay = 1000,
	cachedState,
	pollTimeout = 5000,
	pollTimeoutId,
	emitter;

var signature = {
	commands: {
		'setPower': {
			type: 'boolean'
		},
		'setVolume': {
			type: 'number',
			minimum: -80.5,
			maximum: 0,// 165 for reals, but don't want to allow that
			unit: 'db'
		}
	},
	events: {
		power: {
			type: 'boolean'
		},
		volume: {
			type: 'number',
			minimum: -80,
			maximum: 0,
			unit: 'db'
		}
	},
	settings: {
		host: {
			type: 'string',
			pattern: '^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$',
			label: 'ip address',
			required: true
		}
	}
};

Object.freeze( signature );

// TODO: consider implementing single string colors via api, ex: purple

/* PRIVATE */

/**
 * Async request current amp state
 * @returns {Promise}
 */
function getStatePromise() {
	return yamaha.getBasicInfo().then( parseAmpState );
}

function storeState( data ) {
	console.log( 'amp state stored', data );
	cachedState = data;
}

/**
 * Function parses response from amp
 * @param {Object} obj  raw json response from api
 * @returns {Promise}
 */
function parseAmpState( obj ) {
	var newObj = {
		nativeId: 'hard-coded-id',
		label: '',
		type: 'amplifier',
		power: obj.isOn(),
		volume: obj.getVolume()/10
	};

	console.log( 'parseAmpState', newObj );
	return Promise.resolve( newObj );
}

/**
 *
 * @param cached
 * @param current
 */
function diffState( cached, current ) {
	if ( !cached ) {
		storeState( current );
		emitter.emit( current );
	} else if ( JSON.stringify( cached ) !== JSON.stringify( current ) ) {
		emitter.emit( current );
	}

	cachedState = current.slice( 0 );
}

/**
 * Function regularly polls lights' states to make sure external changes are kept track of
 */
function pollStatus() {
	clearTimeout( pollTimeoutId );
	pollTimeoutId = setTimeout( pollStatus, pollTimeout );

	getStatePromise()
		.then( function( states ) {
			diffState( cachedState, states );
		} ).then( function() {
		setTimeout( pollStatus, pollDelay );
	} );
}

/* PUBLIC */
var api = {};

/**
 * @param {Boolean} power  state to set
 */
api.setPower = function( power ) {
	var fn = power ? 'powerOn' : 'powerOff';
	console.log( 'setPower:', fn );
	yamaha[ fn ]();
};

/**
 * TODO: rational volume range... 0 - 100? -85db - 0 db?
 * @param vol
 */
api.setVolume = function( vol ) {
	yamaha.setVolumeTo( vol * 10 );
};

function init( globalSettings, platformSettings, em ) {
	emitter = em;
	yamaha = new YamahaAPI( platformSettings.host );
	pollStatus();
	console.log( 'yamaha ready' );
}

module.exports = {
	command: function( cmd ) {
		var args = [].splice.call( arguments, 1 );
		console.log( 'command', cmd, args );
		api[ cmd ].apply( this, args );
	},
	init: init,
	signature: signature
};

init( {}, { host: '10.0.1.110' }, {
	emit: function() {
		console.log( arguments );
	}
} );
