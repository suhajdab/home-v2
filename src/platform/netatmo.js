'use strict';
var debug = require( 'debug' )( 'netatmo' );
var Netatmo = require( 'netatmo' ),
	netatmo;

// to debug use DEBUG=netatmo environmental variable
// ex: DEBUG=netatmo node src/platform/netatmo.js

var cachedData = {},
	pollDelay = 5 * 60 * 1000, // every 5 min
	emitter;

var signature = {
	events: {
		temperature: {
			type: 'number',
			minimum: -30,
			maximum: 40,
			unit: 'Celsius'
		},
		co2: {
			type: 'int',
			minimum: 200,
			maximum: 4000,
			unit: 'ppm'
		},
		humidity: {
			type: 'int',
			minimum: 0,
			maximum: 100,
			unit: '%'
		},
		pressure: {
			type: 'int',
			minimum: 960,
			maximum: 1000,
			unit: 'mbar'
		},
		noise: {
			type: 'int',
			minimum: 0,
			maximum: 100,
			unit: 'db'
		}
	},
	settings: {
		client_id: {
			type: 'string',
			label: 'client_id',
			required: true
		},
		client_secret: {
			type: 'string',
			label: 'client_secret',
			required: true
		},
		username: {
			type: 'string',
			label: 'username',
			required: true
		},
		password: {
			type: 'string',
			label: 'password',
			required: true
		}
	}
};

Object.freeze( signature );

/**
 * API limit
 * https://dev.netatmo.com/doc/privateapi
 *      measurements are recorded every 5 min
 *    50 requests every 10 seconds
 *    500 requests every hour
 *
 *    ex device JSON
 *    {
                "_id": "70:ee:50:00:b0:7c",
                "access_code": "",
                "alarm_config": {
                        "default_alarm": [],
                        "personnalized": []
                },
                "battery_vp": 0,
                "cipher_id": "",
                "co2_calibrating": false,
                "date_setup": {
                        "sec": 1365716567,
                        "usec": 445000
                },
                "firmware": 102,
                "invitation_disable": false,
                "last_status_store": 1455140941,
                "last_upgrade": 1439999566,
                "meteo_alarms": [],
                "module_name": "Dining room",
                "modules": [
                        "02:00:00:00:b2:0a"
                ],
                "place": {
                        "altitude": 39,
                        "country": "SE",
                        "geoip_city": "Veberöd",
                        "location": [
                                13,
                                55
                        ],
                        "timezone": "Europe/Stockholm"
                },
                "station_name": "onereason",
                "type": "NAMain",
                "wifi_status": 64,
                "dashboard_data": {
                        "AbsolutePressure": 985.8,
                        "time_utc": 1455140924,
                        "Noise": 54,
                        "Temperature": 17.9,
                        "Humidity": 51,
                        "Pressure": 990.3,
                        "CO2": 909,
                        "date_max_temp": 1455107931,
                        "date_min_temp": 1455091980,
                        "min_temp": 17.3,
                        "max_temp": 17.9
                },
                "data_type": [
                        "Temperature",
                        "CO2",
                        "Humidity",
                        "Noise",
                        "Pressure"
                ]
        }

 */


function logError( err ) {
	console.error( err.stack );
}

/**
 * Function returns device data standardized for devices.js
 * @param {Object} device  Device attributes and measurements from netatmo api
 * @returns {Object} Ex: device_id: { attr1: val1, attr2: val2 }
 */
function formatEmitData( device ) {
	var emitData = {};

	emitData[ device._id ] = device.data;
	return emitData;
}

/**
 * Function convert array of values returned by netatmo api to key-value pairs
 * @param {Object} device Device attributes from netatmo api
 * @param {Array} values Measures from netatmo api
 * @returns {Object} Ex: { attr1: val1, attr2: val2 }
 */
function formatMeasureData( device, values ) {
	return device.data_type.reduce( function( accu, curr, i ) {
		curr = curr.toLowerCase();
		accu[ curr ] = values[ i ];
		return accu;
	}, {} );
}

/**
 * Function convert array of values returned by netatmo api to key-value pairs
 * @param {Object} device Device attributes from netatmo api
 * @param {Array} values Measures from netatmo api
 * @returns {Object} Ex: { attr1: val1, attr2: val2 }
 */
function formatDeviceData( device ) {
	return {
		id: device._id,
		type: 'environment',
	};
}

/**
 * Function generates either device or module options for netatmo api request
 * @param {Object} device Device attributes from netatmo api
 * @returns {Object} Options object
 */
function generateDeviceOptions( device ) {
	var opts = {
		scale: 'max',
		date_end: 'last',
		type: device.data_type
	};

	// differentiate between main device and module options
	if ( device.main_device ) {
		opts.module_id = device._id;
		opts.device_id = device.main_device;
	} else {
		opts.device_id = device._id;
	}

	return opts;
}

/**
 * Function makes a netatmo api request for measures
 * @param {Object} device Device attributes from netatmo api
 * @returns {Promise}
 */
function getMeasure( device ) {
	debug( 'getMeasure in', 'device = ', device );

	return new Promise( function( resolve, reject ) {
		netatmo.getMeasure( device.options, function( err, measure ) {
			if ( err ) {
				reject( new Error( err ) );
			} else {
				resolve( measure );
			}
		} );
	} );
}

/**
 * Function handles raw data from netatmo api request
 * @param {Array} measure Measures from netatmo api
 * @returns {Promise}
 */
function parseMeasure( measure ) {
	var device = this;
	debug( 'parseMeasure in', 'measure = ' + JSON.stringify( measure ) );
	try {
		var values = measure[ 0 ].value[ 0 ];
		device.data = formatMeasureData( device, values );

		debug( 'parseMeasure out', device.module_name + ' : ' + JSON.stringify( device.data, null, '\t' ) );
		return Promise.resolve( device );
	} catch ( e ) {
		return Promise.reject( new Error( e ) );
	}
}

/**
 * Function compares cached measures to received ones, and emits standardized device data if they differ
 * @param {Object} device Device attributes from netatmo api
 * @returns {Promise}
 */
function emitChange( device ) {
	if ( JSON.stringify( cachedData[ device._id ] ) != JSON.stringify( device.data ) ) {
		debug( 'emitChange', 'data = ' + JSON.stringify( device.data ) );
		emitter.emit( formatEmitData( device ) );
	}

	return Promise.resolve( device );
}

/**
 * Functions updates cache with latest data
 * @param {Object} device Device attributes from netatmo api
 * @returns {Promise}
 */
function updateCache( device ) {
	debug( 'updateCache', JSON.stringify( device.data ) );
	cachedData[ device._id ] = device.data;
	return Promise.resolve( device );
}

/**
 * Function calls getData after pollDelay timeout
 * @param {Object} device Device attributes from netatmo api
 */
function waitAndRefresh( device ) {
	debug( 'waitAndRefresh', 'timeout = ' + ( pollDelay / 1000 ) + 's' );
	setTimeout( getData.bind( device ), pollDelay );
}

/**
 * Function wraps promise chain for fetching and dealing with netatmo environment data
 */
function getData() {
	// TODO: error handling should try again
	getMeasure( this )
		.then( parseMeasure.bind( this ) )
		.then( emitChange )
		.then( updateCache )
		.then( waitAndRefresh )
		.catch( logError );
}

function registerDevice( device ) {
	emitter.emit( {
		event: 'device found',
		data: formatDeviceData( device )
	} );
}

/**
 * Function initializes cache and creates request options for netatmo api, then starts polling
 * @param {Object} device Device attributes from netatmo api
 */
function setupDevice( device ) {
	// create object to store device data
	cachedData[ device._id ] = {};

	// options for fetching device measurements
	device.options = generateDeviceOptions( device );

	registerDevice( device );
	getData.bind( device )();
}

/**
 * Callback function for fetching device list, initiates setup of devices and modules
 * @param {Object} err Request error
 * @param {Array} devices Devices received netatmo api
 * @param {Array} modules Modules received from netatmo api
 */
function onGotDeviceList( err, devices, modules ) {
	if ( err ) throw ( err );

	debug( 'Got Netatmo device list: ' + JSON.stringify( devices, [ '_id', 'module_name' ], '\t' ) );
	debug( 'Got Netatmo module list: ' + JSON.stringify( modules, [ '_id', 'module_name' ], '\t' ) );

	devices.forEach( setupDevice );
	modules.forEach( setupDevice );
}

/**
 * Function call after successful init
 */
function ready() {
	debug( 'ready' );

	netatmo.getDevicelist( onGotDeviceList );
}

/**
 * Function called by devices.js to initialize platform
 * @param {Object} globalSettings
 * @param {Object} platformSettings
 * @param {Object} em Emitter
 */
function init( globalSettings, platformSettings, em ) {
	debug( 'init with arguments', JSON.stringify( arguments ) );
	emitter = em;
	netatmo = new Netatmo( platformSettings );
	ready();
}

module.exports = {
	init: init,
	signature: signature
};
