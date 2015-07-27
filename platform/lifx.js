/*
 Lifx API

 base url: https://api.lifx.com/v1beta1/lights

 GET /all - Lists all lights
 GET /{selector} - Lists lights matching selector
 PUT /{selector}/power/- Turns lights matching selector on
 PUT /lights/{selector}/toggle - Toggle lights matching selector. If any lights in selector is on, it will turn them off
 PUT /:selector/color

 '{"hue": 120, "saturation": 1, "brightness": 1, "duration":2}'

 Hue: 0-360
 Saturation: 0-1
 Brightness: 0-1
 Kelvin: 2500-9000. Defaults to 3500 (optional)
 Duration in seconds ( or m or h ) (optional)

 */
require( 'es6-promise' ).polyfill();

//	color conversion library
var Colr = require( 'Colr' ),
	fetch = require( 'node-fetch' );

var apiUrl = 'https://api.lifx.com/v1beta1/lights',
	token;

//var signature = {
//	platform: 'lifx',
//	type: 'lamp',
//	service: {
//		on: [
//			'newBulb',
//			'stateChange'
//		],
//		set: [
//			{ on: { params: [ 'id', 'duration' ] } },
//			{ off: { params: [ 'id', 'duration' ] } },
//			{ setColor: {} },
//			{ setWhite: {} }
//		]
//	}
//};

/* PRIVATE */
/**
 * Fetch promise generator
 * @param {String} url
 * @param {Object} data - parameters to send to server
 * @param {String} method - request method
 * @returns {Promise}
 */
// TODO: need to handle 4xx, 5xx responses (they don't reject fetch promise)
function apiFetch( url, data, method ) {
	'use strict';

	var headers = {
		'Content-Type': 'application/json',
		'Authorization': 'Bearer ' + token

	};
	url = apiUrl + url;
	data = data || {};
	method = method || 'get';

	return fetch( url, {
		method: method,
		headers: headers,
		body: JSON.stringify( data )
	} ).then( function ( res ) {
		return res.json();
	} );
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
	'use strict';

	var hsv = Colr.fromHslObject( hsl ).toHsvObject(),
		HSB = {
			hue: hsv.h, // 0 - 360 degrees => 0 - 65534
			saturation: hsv.s / 100,
			brightness: hsv.v / 100
		};
	return HSB;
}

function addDuration( stateObj, duration ) {
	'use strict';

	if ( duration !== undefined ) {
		stateObj.duration = duration;
	}
}

/* PUBLIC */
/**
 * Returns an array of known devices with id & label
 *
 * @returns {Promise}
 */
function getAllLights() {
	'use strict';

	return apiFetch( '/all' )
		.then( function ( result ) {
			var newObj = result.map( function ( obj ) {
				var tag = obj.group && obj.group.name ? 'room:' + obj.group.name : '';
				return {
					nativeId: obj.id,
					label: obj.label,
					type: 'light',
					platform: 'lifx', // TODO: remove hardcoded platform,
					connected: obj.connected,
					power: obj.power,
					color: obj.color,
					brightness: obj.brightness,
					tags: [ tag ]
				};
			} );
			return Promise.resolve( newObj );
		} );
}

/**
 *
 * @param id
 * @returns {Promise}
 */
function getState( id ) {
	'use strict';

	return apiFetch( id );
}

/**
 *
 * @param id
 * @param fn
 * @param stateObj
 * @param duration
 * @returns {Promise}
 */
function setState( id, fn, stateObj, duration, powerOn ) {
	'use strict';

	id = id || 'all';
	fn = fn || 'color';
	if ( typeof powerOn !== 'undefined' ) {
		stateObj.power_on = powerOn; //eslint-disable-line camelcase
	}
	addDuration( stateObj, duration );
	return apiFetch( '/' + id + '/' + fn, stateObj, 'put' );
}

/**
 *
 * @param id
 * @param duration
 * @returns {Promise}
 */
function on( id, duration ) {
	'use strict';

	var stateObj = { state: 'on' };
	return setState( id, 'power', stateObj, duration );
}

/**
 *
 * @param id
 * @param duration
 * @returns {Promise}
 */
function off( id, duration ) {
	'use strict';

	var stateObj = { state: 'off' };
	return setState( id, 'power', stateObj, duration );
}

/**
 * Set color of lamp with specified id
 *
 * Request Data
 *    {
 *		"color": "hue:120 saturation:1.0 brightness:0.5",
 *		"duration": 2,
 *		"power_on": true
 *	}
 *
 * @param {String} id
 * @param {Object} hsl - HSL color
 * @param {Number} hsl.h - hue ( 0 - 360 )
 * @param {Number} hsl.s - saturation ( 0 - 100 )
 * @param {Number} hsl.l - luminance ( 0 - 100 )
 * @returns {Promise}
 */
function setColor( id, hsl, duration, powerOn ) {
	'use strict';

	var hsb = convertToHSB( hsl ),
		stateObj = {
			color: 'hue:' + hsb.hue + ' saturation:' + hsb.saturation + ' brightness:' + hsb.brightness,
			power_on: powerOn || false // eslint-disable-line camelcase
		};
	return setState( id, 'color', stateObj, duration );
}

/**
 *    Set a white color on the lamp with specified id
 * @param {String} id
 * @param {Number} kelvin - white temperature of lamp ( warm: 2500 - cool: 9000 )
 * @param {Number} brightness - brightness of lamp ( 0 - 100 )
 * @returns {Promise}
 */
// TODO move brightness math out
function setWhite( id, kelvin, brightness, duration, powerOn ) {
	'use strict';

	var stateObj = {
		color: 'brightness:' + ( brightness / 100 ) + ' kelvin:' + kelvin
	};
	return setState( id, 'color', stateObj, duration, powerOn );
}

function init( globalSettings, platformSettings ) {
	'use strict';

	token = platformSettings.get( 'token' );
	console.log( 'lifx ready' );
}

module.exports = {
	// should return all known devices
	getDevices: getAllLights,
	getState: getState,
	setColor: setColor,
	setWhite: setWhite,
	on: on,
	off: off,
	init: init
};

/*
 hubby's nl : d073d5001b3b
 seashell : d073d50018c1
 dining table : d073d5001acc
 island lamp : d073d5000cb1
 */

//test
//setWhite('d073d5000cb1', 3000, 100, 5).then( console.log.bind(console) );
//setColor('d073d5000cb1', {h:280,s:100,l:50}, 5).then( console.log.bind(console) );
