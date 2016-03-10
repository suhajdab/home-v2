'use strict';

var debug = require( 'debug' )( 'lifx' );
var deepFreeze = require( 'deep-freeze' );
const validatePlatformCommand = require( '../utils/' ).validatePlatformCommand;

var Colr = require( 'Colr' ),
	LifxClient = require( 'node-lifx' ).Client,
	client = new LifxClient();

var pollDelay = 500,
	cachedState = [],
	pollTimeout = 5000,
	pollTimeoutId,
	emitter;

const signature = {
	commands: {
		'setPower': {
			type: 'object',
			properties: {
				id: {
					type: 'string',
					required: true
				},
				power: {
					type: 'boolean',
					required: true
				},
				duration: {
					type: 'number',
					minimum: 0,
					maximum: 86400000,
					unit: 'milliseconds'
				}
			}
		},
		'setWhite': {
			type: 'object',
			properties: {
				id: {
					type: 'string',
					required: true
				},
				kelvin: {
					type: 'number',
					minimum: 2500,
					maximum: 9000,
					unit: 'kelvin',
					required: true
				},
				brightness: {
					type: 'number',
					minimum: 0,
					maximum: 100,
					unit: '%'
				},
				duration: {
					type: 'number',
					minimum: 0,
					maximum: 86400000,
					unit: 'milliseconds'
				}
			}
		},
		'setHSL': {
			type: 'object',
			properties: {
				id: {
					type: 'string',
					required: true
				},
				hue: {
					type: 'number',
					minimum: 0,
					maximum: 360,
					required: 'any'
				},
				saturation: {
					type: 'number',
					minimum: 0,
					maximum: 100,
					required: 'any'
				},
				luminance: {
					type: 'number',
					minimum: 0,
					maximum: 100,
					required: 'any'
				},
				duration: {
					type: 'number',
					minimum: 0,
					maximum: 86400000,
					unit: 'milliseconds'
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
					type: 'number',
					minimum: 0,
					maximum: 360
				},
				saturation: {
					type: 'number',
					minimum: 0,
					maximum: 100
				},
				luminance: {
					type: 'number',
					minimum: 0,
					maximum: 100
				}
			}
		},
		white: {
			type: 'number',
			minimum: 2500,
			maximum: 9000,
			unit: 'kelvin'
		},
		brightness: {
			type: 'number',
			minimum: 0,
			maximum: 100,
			unit: '%'
		}
	},
	settings: {
		defaultDuration: {
			type: 'number',
			minimum: 0,
			maximum: 86400000,
			unit: 'milliseconds'
		}
	}
};

deepFreeze( signature );

// TODO: consider implementing single string colors via api, ex: purple
// TODO: apis should allow for skipping properties to only adjust 1 aspect without touching others (ex: change hue, not sat & lum & power)

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

	emitter.emit( {
		name: 'device found',
		nativeId: data.nativeId,
		payload: data
	} );
	cachedState.push( data );
}

function getLightById( id ) {
	const args = [].slice.call( arguments, 1 );
	return new Promise( function( resolve, reject ) {
		var light = client.light( id );
		if ( !light ) {
			reject( new Error( 'Lifx light with id:' + id + ' not found!' ) );
		} else {
			resolve( [].concat( light, args ) );
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
	let newObj = {
		nativeId: obj.id,
		label: obj.label,
		type: 'light',
		power: obj.power,
		color: obj.color
	};

	debug( 'parseLightState', newObj );
	return Promise.resolve( newObj );
}

/**
 * Function takes an HSL color and converts it to HSB in ranges for device
 * @param {Object} hsl - HSL color
 * @param {number} hsl.h - hue ( 0 - 360 )
 * @param {number} hsl.s - saturation ( 0 - 100 )
 * @param {number} hsl.l - luminance ( 0 - 100 )
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
 * @param {string} nativeId
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
		} else if ( JSON.stringify( cached ) !== JSON.stringify( current ) ) {
			debug( 'change detected' );
			emitter.emit( {
				name: 'change',
				nativeId: current.nativeId,
				payload: current
			} );
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
		.then( ( states ) => {
			diffState( cachedState, states );
		} )
		.then( () => {
			setTimeout( pollStatus, pollDelay );
		} );
}

/**
 * Returns an array of known devices with id & label
 *
 * @returns {Promise}
 */
function getAllLightStates() {
	var statePromises = client.lights().map( ( light ) => {
		return getStatePromise( light ).then( parseLightState );
	} );
	return Promise.all( statePromises );
}

/**
 * Applies command with arguments
 * @param {Object} args  command arguments
 * @returns {Promise}
 */
function applyCommand( args ) {
	debug( 'applyCommand', args );
	return api[ args[ 0 ] ]( args[ 1 ] );
}

/**
 *
 * @param arr
 * @returns {Promise}
 */
function execCommand( arr ) {
	// let there be destructuring
	const light = arr[ 0 ];
	const cmd = arr[ 1 ];
	const args = [].slice.call( arr, 2 );

	debug( 'execCommand', light, cmd, args );

	return new Promise( function( resolve, reject ) {
		light[ cmd ].apply( light, args, ( err ) => { if ( err ) reject( new Error( err ) ); else resolve( true ); } );
	} );
}

/* PUBLIC */
var api = {};

/**
 * Turns on light with specified id
 *
 * @param {Object} args
 * @param {string} args.id  light's native id
 * @param {Boolean} args.power  state to set
 * @param {number} args.duration  duration of transition in ms
 * @returns {Promise}
 */
api.setPower = function( args ) {
	var fn = args.power ? 'on' : 'off';
	debug( 'setPower:', arguments );

	return getLightById( args.id, fn, args.duration ).then( execCommand );
};

/**
 * Set color of lamp with specified id
 *
 * @param {Object} args
 * @param {string} args.id
 * @param {number} args.h - hue ( 0 - 360 )
 * @param {number} args.s - saturation ( 0 - 100 )
 * @param {number} args.l - luminance ( 0 - 100 )
 * @param {number} args.duration
 */
api.setHSL = function( args ) {
	var hsb = convertToHSB( { h: args.hue, s: args.saturation, l: args.luminance } );

	debug( 'setHSL', arguments, hsb );
	return getLightById( args.id, 'color', hsb.hue, hsb.saturation, hsb.brightness, 3500, args.duration ).then( execCommand );
};

/**
 * Set a white color on the lamp with specified id
 *
 * @param {Object} args
 * @param {string} args.id
 * @param {number} args.kelvin - white temperature of lamp ( warm: 2500 - cool: 9000 )
 * @param {number} args.brightness - brightness of lamp ( 0 - 100 )
 * @param {number} args.duration
 */
api.setWhite = function( args ) {
	return getLightById( args.id, 'color', 0, 0, args.brightness, args.kelvin, args.duration ).then( execCommand );
};

/**
 *
 * @param globalSettings
 * @param platformSettings
 * @param em
 */
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
	command: function( cmd, args ) {
		debug( 'received command', cmd, args );

		return validatePlatformCommand( signature, cmd, args ).then( applyCommand );
	},
	init: init,
	signature: signature
};
