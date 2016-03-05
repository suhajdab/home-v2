'use strict';

var debug = require( 'debug' )( 'lifx' );

var Colr = require( 'Colr' ),
	LifxClient = require( 'node-lifx' ).Client,
	client = new LifxClient();

var pollDelay = 500,
	defaultDuration = 5000,
	cachedState = [],
	pollTimeout = 5000,
	pollTimeoutId,
	emitter;

var signature = {
	commands: {
		'setPower': {
			type: 'boolean'
		},
		'setWhite': {
			type: 'int',
			minimum: 2500,
			maximum: 9000,
			unit: 'kelvin'
		},
		'setHSL': {
			type: 'object',
			properties: {
				hue: {
					type: 'float',
					minimum: 0,
					maximum: 360
				},
				saturation: {
					type: 'float',
					minimum: 0,
					maximum: 100
				},
				luminance: {
					type: 'float',
					minimum: 0,
					maximum: 100
				}
			}
		}
	},
	events: {
		power: {
			type: 'boolean'
		},
		color: {
			type: 'object',
			properties: {
				hue: {
					type: 'float',
					minimum: 0,
					maximum: 360
				},
				saturation: {
					type: 'float',
					minimum: 0,
					maximum: 100
				},
				luminance: {
					type: 'float',
					minimum: 0,
					maximum: 100
				}
			}
		},
		white: {
			type: 'int',
			minimum: 2500,
			maximum: 9000,
			unit: 'kelvin'
		}
	},
	settings: {}
};

Object.freeze( signature );

// TODO: consider implementing single string colors via api, ex: purple

/* PRIVATE */

/**
 * Event handler for light discovery: parses light data, and caches
 * @param light - discovered light instance
 */
function onNewLight( light ) {
	getStatePromise( light ).then( parseLightState ).then( storeLight );
}

/**
 * Async requests current light state
 * @param light
 * @returns {Promise}
 */
function getStatePromise( light ) {
	return new Promise( function( resolve, reject ) {
		light.getState( function( err, info ) {
			if ( err ) {
				return reject( err );
			}
			if ( !info ) return reject( new Error( 'Empty light info object' ) );
			info.id = light.id;
			resolve( info );
		} );
	} );
}

function storeLight( data ) {
	debug( 'storeLight', data );
	cachedState.push( data );
}

function getLightById( id ) {
	return new Promise( function( resolve, reject ) {
		var light = client.light( id );
		if ( !light ) {
			reject( new Error( 'Lifx light with ' + id + ' not found!' ) );
		} else {
			resolve( light );
		}
	} );
}

/**
 * Function parses response from lifx module
 * Ex:  { color: { hue: 0, saturation: 0, brightness: 51, kelvin: 2500 }, power: 1, label: 'Dining table', id: 'xyz123' }
 * @param {Object} states  raw json response from api
 * @returns {Promise}
 */
function parseLightState( obj ) {
	var tag = obj.group && obj.group.name ? 'room:' + obj.group.name : '',
		newObj = {
			nativeId: obj.id,
			label: obj.label,
			type: 'light',
			power: obj.power,
			color: obj.color,
			tags: [ tag ]
		};

	debug( 'parseLightState', newObj );
	return Promise.resolve( newObj );
}

/**
 * Function takes an HSL color and converts it to HSB in ranges for device
 * @param {Object} hsl - HSL color
 * @param {Number} hsl.h - hue ( 0 - 360 )
 * @param {Number} hsl.s - saturation ( 0 - 100 )
 * @param {Number} hsl.l - luminance ( 0 - 100 )
 * @returns {{hue: (hsv.h|*), saturation: number, brightness: number}}
 */
function convertToHSB( hsl ) {
	var hsv = Colr.fromHslObject( hsl ).toHsvObject(),
		HSB = {
			hue: hsv.h, // 0 - 360 degrees => 0 - 65534
			saturation: hsv.s,
			brightness: hsv.v
		};
	return HSB;
}

/**
 * Function searches for a given native device id in an array
 * @param {String} nativeId
 * @param {Array} deviceArray
 * @returns {Object}  found device object or false
 */
function findByNativeId( nativeId, deviceArray ) {
	var i, obj;

	for ( i = 0; obj = deviceArray[ i ]; i++ ) {
		if ( obj.nativeId === nativeId ) {
			return obj;
		}
	}
	return false;
}

/**
 *
 * @param cachedStates
 * @param currentStates
 */
// TODO: rewrite with [].reduce to return modified states, then handle that array
function diffState( cachedStates, currentStates ) {
	// TODO detect add/remove of devices
	var i,
		cached,
		current;

	for ( i = 0; current = currentStates[ i ]; i++ ) {
		cached = findByNativeId( current.nativeId, cachedStates );

		if ( !cached ) {
			storeLight( current );
			emitter.emit( current );
		} else if ( JSON.stringify( cached ) !== JSON.stringify( current ) ) {
//			console.log( 'difference' );
//			console.log( JSON.stringify( cached ) );
//			console.log( JSON.stringify( current ) );
			emitter.emit( current );
		}
	}

	cachedState = currentStates.slice( 0 );
}

/**
 * Function regularly polls lights' states to make sure external changes are kept track of
 */
function pollStatus() {
	clearTimeout( pollTimeoutId );
	pollTimeoutId = setTimeout( pollStatus, pollTimeout );

	getAllLightStates()
		.then( function( states ) {
			diffState( cachedState, states );
		} ).then( function() {
		setTimeout( pollStatus, pollDelay );
	} );
}

/**
 * Returns an array of known devices with id & label
 *
 * @returns {Promise}
 */
function getAllLightStates() {
	var statePromises = client.lights().map( function( light ) {
		return getStatePromise( light ).then( parseLightState );
	} );
	return Promise.all( statePromises );
}

/* PUBLIC */
var api = {};

/**
 * Turns on light with specified id
 *
 * @param id
 * @param {Boolean} power  state to set
 * @param {Number} [duration=defaultDuration]
 */
api.setPower = function( id, power, duration ) {
	var fn = power ? 'on' : 'off';
	console.log( 'setPower:', id, fn );
	duration = duration || defaultDuration;
	client.light( id )[ fn ]( duration );
};

/**
 * Set color of lamp with specified id
 *
 * @param {String} id
 * @param {Object} hsl - HSL color
 * @param {Number} hsl.h - hue ( 0 - 360 )
 * @param {Number} hsl.s - saturation ( 0 - 100 )
 * @param {Number} hsl.l - luminance ( 0 - 100 )
 * @param {Number} [duration=defaultDuration]
 */
api.setColor = function( id, hsl, duration ) {
	var hsb = convertToHSB( hsl );
	duration = duration || defaultDuration;

	client.light( id ).color( hsb.hue, hsb.saturation, hsb.brightness, 3500, duration );
};

/**
 * Set a white color on the lamp with specified id
 *
 * @param {String} id
 * @param {Number} kelvin - white temperature of lamp ( warm: 2500 - cool: 9000 )
 * @param {Number} brightness - brightness of lamp ( 0 - 100 )
 * @param {Number} [duration=defaultDuration]
 */
api.setWhite = function( id, kelvin, brightness, duration, powerOn ) {
	duration = duration || defaultDuration;
	client.light( id ).color( 0, 0, brightness, kelvin, duration );
};

function init( globalSettings, platformSettings, em ) {
	emitter = em;
	client.init();
//	client.on( 'light-new', onNewLight );
	// TODO keep track of availability / reachability
//	client.on( 'light-offline', function( light ) {
//	} );
//	client.on( 'light-online', function( light ) {
//	} );
	pollStatus();
	debug( 'init', globalSettings, platformSettings );
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

//init();
