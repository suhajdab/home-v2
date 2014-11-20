require( 'es6-promise' ).polyfill();

//	color conversion library
var Colr = require( 'Colr' );

//	rest client to access lifx-http server
var Client = require( 'node-rest-client' ).Client,
	client = new Client();

var baseUrl = 'http://localhost:56780/lights';

/*
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

function requestPromise ( url, args, method ) {
	'use strict';
	url = baseUrl + ( url ? '/' + url : '' ) + '.json';
	args = args || {};
	method = method || 'get';

	return new Promise( function ( resolve, reject ) {
		var req = client[method]( url, args, function( data, response ) {
			// parsed response body as js object
			resolve( data );
		});

		req.on( 'error', function( err ){
			reject( 'request error', err );
		});
	});
}

function getAllLights () {
	return requestPromise();
}

function getState ( id ) {
	return requestPromise( id );
}

function setState ( id, fn, args ) {
	id = id || 'all';
	fn = fn || 'color';
	args = args || {};

	return requestPromise( id + '/' + fn, args, 'put' );
}

function on ( id ) {
	return setState( id, 'on' );
}

function off ( id ) {
	return setState( id, 'off' );
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
function setColor ( id, hsl ) {
	var hsv = Colr.fromHslObject( hsl ).toHsvObject(),
		colorArg = {
			hue: hsv.h,
			saturation: hsv.s / 100,
			brightness: hsv.v / 100
		};
	return setState( id, 'color', colorArg );
}

/**
 *	Set a white color on the lamp with specified id
 * @param {String} id
 * @param {Number} kelvin - white temperature of lamp ( warm: 2500 - cool: 10000 )
 * @param {Number} brightness - brightness of lamp ( 0 - 100 )
 * @returns {Promise}
 */
function setWhite ( id, kelvin, brightness ) {
	var colorArg = {
		hue: 0,
		seturation: 1,
		brightness: brightness || 1,
		kelvin: kelvin || 3500
	};
	 return setState( id, 'color', colorArg );
}

module.exports = {
	getAllLights: getAllLights(),
	getState: getState,
	setColor: setColor,
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