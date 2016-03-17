'use strict';

const debug = require( 'debug' )( 'hue' ),
	deepFreeze = require( 'deep-freeze' ),
	validatePlatformCommand = require( '../utils/' ).validatePlatformCommand,
	Colr = require( 'Colr' ),
	hue = require( 'node-hue-api' ),
	HueApi = hue.HueApi;

var hueApi,
	emitter,
	pollDelay = 500,
	cachedState = [],
	pollTimeout = 5000,
	pollTimeoutId;

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
			type: 'int',
			minimum: 2500,
			maximum: 6500,
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
			maximum: 10000,
			unit: 'kelvin'
		}
	},
	settings: {
		host: {
			type: 'string',
			pattern: '^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$',
			label: 'ip address',
			required: true
		},
		username: {
			type: 'string',
			label: 'username',
			required: true
		}
	}
};

deepFreeze( signature );

var deviceStates = {};

/*
 node-hue-api API

 on() 			{ on: true }
 off()			{ on: false }

 white(colorTemp, brightPercent) where colorTemp is a value between 154 (cool) and 500 (warm) and brightPercent is 0 to 100
 white(154,100)	{ ct: 154, bri: 254 }

 brightness(percent) where percent is the brightness from 0 to 100
 brightness(50)	{ bri: 127 }

 hsl(hue, saturation, brightPercent) where hue is a value from 0 to 359, saturation is a percent value from 0 to 100, and brightPercent is from 0 to 100
 hsl(30,50,75)	{ hue: 5476, sat: 127, bri: 191 }

 rgb(red, green, blue) where red, green and blue are values from 0 to 255 - Not all colors can be created by the lights
 transition(seconds) this can be used with another setting to create a transition effect (like change brightness over 10 seconds)
 .transition(5)	{ ..., transitiontime: 50 }


 colors: {
 hue: 0 - 65534,
 sat: 0 - 254,
 bri: 0 - 254
 },
 white: {
 ct: 154 - 500,
 bri: 0 - 254
 }

 */

// TODO: keep polling lights' state and publish changes, so UI can be updated following external changes
// TODO: expose native scheduling api
// TODO: discover hub automatically
// TODO: should create user when unset / needed with button pushing verification
// TODO: setup should validate hub? or per command?

// api.getFullState().then( function( data ) {
// 	console.log(JSON.stringify( data, null, "\t") );
// } ).catch(console.log.bind( console) );

/* UTILITY */

/**
 * Function to compare data received from lights state to old data
 * @param {Object} oldData - data from previous state
 * @param {Object} newData - data from current state
 * @returns {boolean} - result of comparison
 */
function isStateChanged( oldData, newData ) {
	var keys = [ 'lights' ],
		oldFiltered = filterObject( oldData, keys ),
		newFiltered = filterObject( newData, keys );
	return JSON.stringify( oldFiltered ) !== JSON.stringify( newFiltered );
}

/**
 * Function returns Object containing only those properties specified in keys array
 * @param {Object} obj - Object to filter
 * @param {Array} keys - Array of keys to filter by
 * @returns {Object} - New object containing only specified properties
 */
function filterObject( obj, keys ) {
	var newObj = {};
	Object.keys( obj ).forEach( function( key ) {
		if ( ~keys.indexOf( key ) ) newObj[ key ] = obj[ key ];
	} );
	return newObj;
}

/* PRIVATE */

function getDeviceStates() {
}

function standardizeState( state ) {
	// TODO: deal with color temp (ct) which only exists for bulbs
	return {
		brightness: Math.round( state.bri / .254 ) / 10,
		saturation: Math.round( state.sat / .254 ) / 10,
		hue: Math.round( state.hue / 18.203888889 ) / 10,
		reachable: state.reachable
	};
}

/**
 * Function takes HSL and converts it to HSB specific for device
 * @param hsl
 * @returns {{hue: number, saturation: number, brightness: number}}
 */
function convertToHSB( hsl ) {
	var hsv = Colr.fromHslObject( hsl ).toHsvObject(),
		HSB = {
			hue: hsv.h * 182.03888889, // 0 - 360 degrees => 0 - 65534
			saturation: hsv.s * 2.54,
			brightness: hsv.v * 2.54
		};
	return HSB;
}

/**
 * Convert kelvins to mireds
 * @param {number} kelvin
 * @returns {number} mireds
 */
function convertToMireds( kelvin ) {
	var mireds = 1000000 / kelvin;
	return mireds;
}

function addDuration( stateObj, duration ) {
	if ( duration !== undefined ) stateObj.duration = duration;
}

function getLights() {
	hueApi.lights().then( ( lightsObj ) => {
		debug( 'lights', lightsObj );
		lightsObj.lights.forEach( ( inst )=> {
			hueApi.lightStatus( inst.id ).then( ( details )=> {
				debug( details );
				let deviceInfo = formatDeviceInfo( inst, details );
				registerLight( deviceInfo );

				deviceInfo.state = standardizeState( details.state );
				cachedState.push( deviceInfo );

				debug( 'cached state', deviceInfo );
			} );
		} );
	} );
}

function registerLight( d ) {
	const data = Object.assign( {}, d );
	debug( 'registerLight', data );

	emitter.emit( {
		name: 'device found',
		nativeId: data.id,
		payload: data
	} );
}

function formatDeviceInfo( d1, d2 ) {
	return {
		id: d1.id,
		name: d1.name,
		uniqueid: d2.uniqueid,
		type: 'light',
		modelid: d2.modelid,
		manufacturername: d2.manufacturername,
		swversion: d2.swversion
	};
}

/**
 * Apply new state to light, and adjust duration in ms to 0.1s units required by hue
 * documentation: http://www.developers.meethue.com/documentation/lights-api#16_set_light_state
 * @param {number} id
 * @param {Object} stateObj
 * @param {number} [duration] - ms
 * @returns {Promise}
 */
function setState( id, stateObj, duration ) {
	debug( 'setState', arguments );
	if ( duration ) stateObj.transitiontime = duration / 100;
	return hueApi.setLightState( id, stateObj );
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

/* PUBLIC */
var api = {};

/**
 * Turns on light with specified id
 *
 * @param {Object} args
 * @param {number} args.id  light's native id
 * @param {Boolean} args.power  state to set
 * @param {number} args.duration  duration of transition in ms
 * @returns {Promise}
 */
api.setPower = function( args ) {
	debug( 'setPower:', args );

	var stateObj = { on: args.power };
	return setState( args.id, stateObj, args.duration );
};

/**
 * Set color of lamp with specified id
 * @param {number} args.id
 * @param {number} args.hue ( 0 - 360 )
 * @param {number} args.saturation ( 0 - 100 )
 * @param {number} args.luminance  ( 0 - 100 )
 * @param {number} [args.duration] - transition duration
 * @returns {Promise}
 */
api.setColor = function( args ) {
	debug( 'setColor:', args );
	var stateObj = convertToHSB( { h: args.hue, s: args.saturation, l: args.luminance } );
	// force on - hue rejects commands on power-off lights
	stateObj.on = true;
	return setState( args.id, stateObj, args.duration );
}

/**
 * Set a white color on the lamp with specified id
 * Hue takes Mireds for white temperature ( = 1000000 / kelvin )
 * @param {Object} args
 * @param {number} args.id
 * @param {number} args.kelvin - white temperature of lamp ( warm: 2500 - cool: 10000 )
 * @param {number} args.brightness - brightness of lamp ( 0 - 100 )
 * @param {number} [args.duration] - transition duration
 * @returns {Promise}
 */
api.setWhite = function( args ) {
	debug( 'setWhite:', args );
	var stateObj = {
		ct: convertToMireds( args.kelvin ),
		bri: args.brightness * 2.54
	};
	// force on - hue rejects commands on power-off lights
	stateObj.on = true;
	return setState( args.id, stateObj, args.duration );
};

function ready() {
	debug( 'ready' );

	// TODO: start monitoring state changes / polling
}

function init( globalSettings, platformSettings, em ) {
	emitter = em;
	hueApi = new HueApi( platformSettings.host, platformSettings.username );
	debug( 'init', globalSettings, platformSettings );

	ready();
}

module.exports = {
	command: function( cmd, args ) {
		debug( 'received command', cmd, args );

		return validatePlatformCommand( signature, cmd, args ).then( applyCommand );
	},
	init: init,
	signature: signature
};
