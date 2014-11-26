/*
 lifx-http API
 https://github.com/chendo/lifx-http


 GET /lights - Lists all lights
 GET /lights/{selector} - Lists lights matching selector
 PUT /lights/{selector}/on - Turns lights matching selector on
 PUT /lights/{selector}/off - Turns lights matching selector off
 PUT /lights/{selector}/toggle - Toggle lights matching selector. If any lights in selector is on, it will turn them off
 PUT /lights/{selector}/color

 '{"hue": 120, "saturation": 1, "brightness": 1, "duration":2}'

 Hue: 0-360
 Saturation: 0-1
 Brightness: 0-1
 Kelvin: 2500-10000. Defaults to 3500 (optional)
 Duration in seconds ( or m or h ) (optional)

 */

require( 'es6-promise' ).polyfill();

//	color conversion library
var Colr = require( 'Colr' );

//	rest client to access lifx-http server
var Client = require( 'node-rest-client' ).Client,
	client = new Client(),
	apiUrl = 'http://localhost:56780/lights';


/* PRIVATE */

/**
 * Request promise generator
 * @param {String} url
 * @param {Object} params - parameters to send to server
 * @param {String} method - request method
 * @returns {Promise}
 */
function requestPromise ( url, data, method ) {
	'use strict';
	var options = {
		headers:{"Content-Type": "application/json"}
	};
	url = apiUrl + ( url ? '/' + url : '' ) + '.json';
	options.data = data || {};
	method = method || 'get';

	return new Promise( function ( resolve, reject ) {
		var req = client[method]( url, options, function( data, response ) {
			// parsed response body as js object
			resolve( data );
		});
		req.on( 'error', function( err ){
			reject( 'request error', err );
		});
	});
}

/**
 * Function take HSL and converts it to HSB in ranges for device
 * @param {Object} hsl - HSL color
 * @param {Number} hsl.h - hue ( 0 - 360 )
 * @param {Number} hsl.s - saturation ( 0 - 100 )
 * @param {Object} hsl.l - luminance ( 0 - 100 )
 * @returns {{hue: (hsv.h|*), saturation: number, brightness: number}}
 */
function convertToHSB( hsl ) {
	var hsv = Colr.fromHslObject( hsl ).toHsvObject(),
		HSB = {
			hue: hsv.h, // 0 - 360 degrees => 0 - 65534
			saturation: hsv.s / 100,
			brightness: hsv.v / 100
		};
	return HSB;
}

function addDuration( stateObj, duration ) {
	if ( duration !== undefined ) stateObj.duration = duration;
}

/* PUBLIC */

/**
 * Return an array of known devices with id & label
 * @returns {Promise}
 */
function getAllLights () {
	return requestPromise().then( function ( result ) {
		var newObj = result.map( function ( obj ) {
			var tag = obj.tags ? 'room:' + obj.tags[0] : '';
			return {
				nativeId: obj.id,
				label: obj.label,
				type: 'light',
				provider: 'lifx', // TODO: remove hardcoded provider,
				tags: [tag]
			};
		});

		return Promise.resolve( newObj );
	});
}

/**
 *
 * @param id
 * @returns {Promise}
 */
function getState ( id ) {
	return requestPromise( id );
}

/**
 *
 * @param id
 * @param fn
 * @param stateObj
 * @param duration
 * @returns {Promise}
 */
function setState ( id, fn, stateObj, duration ) {
	id = id || 'all';
	fn = fn || 'color';
	addDuration( stateObj, duration );
	return requestPromise( id + '/' + fn, stateObj, 'put' );
}

/**
 *
 * @param id
 * @param duration
 * @returns {Promise}
 */
function on ( id, duration ) {
	return setState( id, 'on', duration );
}

/**
 *
 * @param id
 * @param duration
 * @returns {Promise}
 */
function off ( id, duration ) {
	return setState( id, 'off', duration );
}

/**
 * Set color of lamp with specified id
 * @param {String} id
 * @param {Object} hsl - HSL color
 * @param {Number} hsl.h - hue ( 0 - 360 )
 * @param {Number} hsl.s - saturation ( 0 - 100 )
 * @param {Object} hsl.l - luminance ( 0 - 100 )
 * @returns {Promise}
 */
function setColor ( id, hsl, duration ) {
	return setState( id, 'color', convertToHSB( hsl ), duration );
}

/**
 *	Set a white color on the lamp with specified id
 * @param {String} id
 * @param {Number} kelvin - white temperature of lamp ( warm: 2500 - cool: 10000 )
 * @param {Number} brightness - brightness of lamp ( 0 - 100 )
 * @returns {Promise}
 */
function setWhite ( id, kelvin, brightness, duration ) {
	// lifx requires hue, saturation even when setting white
	var stateObj = {
		hue: 0,
		saturation: 0,
		brightness: brightness,
		kelvin: kelvin
	};

	return setState( id, 'color', stateObj, duration );
}

module.exports = {
	// should return all known devices
	getDevices: getAllLights,
	getState: getState,
	setColor: setColor,
	setWhite: setWhite,
	on: on,
	off: off
};

/*
	hubby's nl : d073d5001b3b
	seashell : d073d50018c1
	dining table : d073d5001acc
	island lamp : d073d5000cb1
 */

//test
//setState( 'd073d5000cb1', 'toggle' ).then( console.log.bind( console ));
//setWhite('d073d5000cb1', 3000, 100, 5).then( console.log.bind(console) );
//setColor('d073d5000cb1', {h:280,s:100,l:50}, 5).then( console.log.bind(console) );
//getAllLights().then( console.log.bind(console) );