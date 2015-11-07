'use strict';

var LifxClient = require( 'node-lifx' ).Client;
var client = new LifxClient();

require( 'es6-promise' ).polyfill();

//	color conversion library
var Colr = require( 'Colr' ),
	objectAssign = require( 'object-assign' );

var pollTimeout = 500,
	defaultDuration = 5000,
	cachedState = [];

// TODO: consider implementing single string colors via api, ex: purple
// TODO: reachability handling? http://api.developer.lifx.com/docs/reachability

/* PRIVATE */

/**
 * Event handler for light discovery: parses light data, and caches
 * @param light - discovered light instance
 */
function onNewLight( light ) {
//	console.log( 'New lifx light found. ID:' + light.id + ', IP:' + light.address + ':' + light.port );
	getStatePromise( light ).then( parseLightStates ).then( storeLight );
}

/**
 * Async requests current light state
 * @param light
 * @returns {Promise}
 */
function getStatePromise( light ) {
	return new Promise( function ( resolve, reject ) {
		light.getState( function ( err, info ) {
			if ( err ) {
				reject( err );
			}
			info.id = light.id;
			console.log( 'light state', info );
			resolve( info );
		} );
	} );
}

function storeLight( data ) {
	cachedState.push( data );
}

function getLightById( id ) {
	return new Promise( function ( resolve, reject ) {
		var light = client.light( identifier );
		if ( !light ) {
			reject( new Error( 'Lifx light with ' + id + ' not found!' ) );
		} else {
			resolve( light );
		}
	} );
}

/**
 * Function parses response from lifx's cloud api
 * @param {Object} states  raw json response from api
 * @returns {Promise}
 */
function parseLightStates( obj ) {
	var newObj,
		tag = obj.group && obj.group.name ? 'room:' + obj.group.name : '';
	newObj = {
		nativeId: obj.id,
		label: obj.label,
		type: 'light',
		platform: 'lifx', // TODO: remove hardcoded platform,
		connected: obj.connected,
		power: obj.power,
		color: obj.color,
		tags: [ tag ]
	};
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
 * @returns {Object}  found device object or empty object
 */
function findByNativeId( nativeId, deviceArray ) {
	var i, obj;

	for ( i = 0; obj = deviceArray[ i ]; i++ ) {
		if ( obj.nativeId === nativeId ) {
			return obj;
		}
	}
	return {};
}

/**
 *
 * @param cachedStates
 * @param currentStates
 */
// TODO: rewrite with [].reduce to return modified states, then handle that array
function diffState( cachedStates, currentStates ) {
	//TODO detect add/remove of devices
	var i,
		cached,
		current;

	for ( i = 0; current = currentStates[ i ]; i++ ) {
		cached = findByNativeId( current.nativeId, cachedStates );

		if ( JSON.stringify( cached ) !== JSON.stringify( current ) ) {
			console.log( current );
		}
	}

	cachedState = objectAssign( {}, currentStates );
}

/**
 * Function regularly polls lights' states to make sure external changes are kept track of
 */
// TODO: polling interval should be a) dynamically adjusted based on remaining API quota b) using 2nd token when 1st is spent
function pollStatus() {
	getAllLightStates()
		.then( parseLightStates )
		.then( function ( states ) {
			diffState( cachedState, states );
			console.log( states );
		} ).then( function () {
		setTimeout( pollStatus, pollTimeout );
	} );
}

/* PUBLIC */
/**
 * Returns an array of known devices with id & label
 *
 * @returns {Promise}
 */
function getAllLightStates() {
	var statePromises = client.lights().map( function ( light ) {
		return getStatePromise( light ).then( parseLightStates );
	} );
	return Promise.all( statePromises );
}

/**
 * Turns on light with specified id
 *
 * @param id
 * @param {Number} [duration=defaultDuration]
 * @returns {Promise}
 */
function on( id, duration ) {
	duration = duration || defaultDuration;
	client.light( id ).on( duration );
}

/**
 * Turns off light with specified id
 *
 * @param id
 * @param {Number} [duration=defaultDuration]
 */
function off( id, duration ) {
	duration = duration || defaultDuration;
	client.light( id ).off( duration );
}

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
function setColor( id, hsl, duration ) {
	var hsb = convertToHSB( hsl );
	duration = duration || defaultDuration;

	client.light( id ).color( hsb.hue, hsb.saturation, hsb.brightness, 3500, duration );
}

/**
 * Set a white color on the lamp with specified id
 *
 * @param {String} id
 * @param {Number} kelvin - white temperature of lamp ( warm: 2500 - cool: 9000 )
 * @param {Number} brightness - brightness of lamp ( 0 - 100 )
 * @param {Number} [duration=defaultDuration]
 */
function setWhite( id, kelvin, brightness, duration, powerOn ) {
	duration = duration || defaultDuration;
	client.light( id ).color( 0, 0, brightness, kelvin, duration );
}

function init( globalSettings, platformSettings ) {
	client.init();
	client.on( 'light-new', onNewLight );
//	pollStatus();
	console.log( 'lifx ready' );
}

module.exports = {
	setColor: setColor,
	setWhite: setWhite,
	on: on,
	off: off,
	init: init
};

init();
