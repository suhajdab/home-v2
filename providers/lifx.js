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
 Kelvin: 2500-10000. Defaults to 3500 (optional)
 Duration in seconds ( or m or h ) (optional)

 */
require( 'es6-promise' ).polyfill();

//	color conversion library
var Colr = require( 'Colr' ),
//	rest client to access lifx-http server
	Client = require( 'node-rest-client' ).Client;

var	client = new Client(),
	apiUrl = 'https://api.lifx.com/v1beta1/lights',
	token;

//var signature = {
//	provider: 'lifx',
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
 * Request promise generator
 * @param {String} url
 * @param {Object} params - parameters to send to server
 * @param {String} method - request method
 * @returns {Promise}
 */
function requestPromise( url, data, method ) {
	'use strict';
	var options = {
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'Bearer ' + token
		}
	};
	url = apiUrl + url;
	options.data = data || {};
	method = method || 'get';
	return new Promise( function ( resolve, reject ) {
		var req = client[ method ]( url, options, function ( data, response ) {
			// parsed response body as js object
			resolve( data );
		} );
		req.on( 'error', function ( err ) {
			reject( 'request error', err );
		} );
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
 *
 *
 * sample api response
 {
    "id": "d073d5001acc",
    "uuid": "028deeda-d6b8-4f35-ac05-077066c968a3",
    "label": "Dining table",
    "connected": true,
    "power": "off",
    "color": {
        "hue": 0.0,
        "saturation": 0.0,
        "kelvin": 2500
    },
    "brightness": 0.4418097199969482,
    "group": {
        "id": "40b76c02a4dc35b31215d347a4744f96",
        "name": "Kitchen"
    },
    "location": {
        "id": "b072a084a7d9b1b2d588db409c1391f7",
        "name": "My Home"
    },
    "product_name": "LIFX Original 1000",
    "capabilities": {
        "has_color": true,
        "has_variable_color_temp": true
    },
    "last_seen": "2015-07-27T08:36:14.914+00:00",
    "seconds_since_seen": 0.001303226
}
 *
 * @returns {Promise}
 */
function getAllLights() {
	'use strict';

	return requestPromise( '/all' ).then( function ( result ) {
		var newObj = result.map( function ( obj ) {
			var tag = obj.tags ? 'room:' + obj.tags[ 0 ] : '';
			return {
				nativeId: obj.id,
				label: obj.label,
				type: 'light',
				provider: 'lifx', // TODO: remove hardcoded provider,
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
function setState( id, fn, stateObj, duration, powerOn ) {
	'use strict';

	id = id || 'all';
	fn = fn || 'color';
	if ( typeof powerOn !== 'undefined' ) {
		stateObj.power_on = powerOn; //eslint-disable-line camelcase
	}
	addDuration( stateObj, duration );
	return requestPromise( id + '/' + fn, stateObj, 'put' );
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
function setWhite( id, kelvin, brightness, duration, powerOn ) {
	'use strict';

	var stateObj = {
		color: 'brightness:' + brightness + ' kelvin:' + kelvin
	};
	return setState( id, 'color', stateObj, duration, powerOn );
}

function init( globalSettings, providerSettings ) {
	'use strict';

	token = providerSettings.get( 'token' );
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
//getAllLights().then( console.log.bind(console) );
