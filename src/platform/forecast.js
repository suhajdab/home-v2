require( 'es6-promise' ).polyfill();
var Forecast = require( 'forecast' );

var forecast, globals, settings, geolocation;

var cachedData = {},
	listeners = [];

var signature = {
	settings: {
		key: {
			type: 'string',
			label: 'access key'
		}
	}
};

Object.freeze( signature );

/**
 * Function to compare data received from service to old data by object keys that contain relevant weather information
 * @param {Object} oldData - data from previous fetches
 * @param {Object} newData - data from current fetch
 * @returns {boolean} - result of comparison
 */
function isWeatherChanged( oldData, newData ) {
	var keys = [ 'currently', 'daily', 'hourly' ],
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

// read location data from system.js
function fetchWeatherData() {
	return new Promise( function( resolve, reject ) {
		forecast.get( [ geolocation.lat, geolocation.long ], true, function( err, weather ) {
			if ( err ) return reject( err );
			else return resolve( weather );
		} );
	} );
}

function storeData( data ) {
	console.log( 'forecast got data: "', data.daily.summary, '". next refresh on ' + new Date( data.expires ) );
	// if ( isWeatherChanged( cachedData, data ) ) dispatch( filterObject( data, [ 'currently', 'daily', 'hourly' ] ) );
	cachedData = data;
	return Promise.resolve( true );
}

function log( obj ) {
	console.log( JSON.stringify( obj, null, '\t' ) );
}

function waitAndRefresh() {
	var timeout = cachedData.expires - Date.now();
	setTimeout( getData, timeout );
}

function getData() {
	// TODO: error handling should try again
	fetchWeatherData().then( storeData ).then( waitAndRefresh ).catch( log );
}

function on( callback ) {
	// does it need more subscribers?? devices.js might be the only one
	listeners.push( callback );
}

function ready() {
	geolocation = globals.get( 'geolocation' );
	var units = globals.get( 'units' ) == 'metric' ? 'c' : 'f';

	console.log( 'forecast ready', geolocation );

	forecast = new Forecast( {
		service: 'forecast.io',
		key: settings.get( 'key' ),
		units: units,
		cache: true,      // Cache API requests?
		ttl: {            // How long to cache requests. Uses syntax from moment.js: http://momentjs.com/docs/#/durations/creating/
			minutes: 30
		}
	} );

	getData();
}

function init( globalSettings, platformSettings ) {
	globals = globalSettings;
	settings = platformSettings;
	ready();
}

module.exports = {
	init: init,
	signature: signature
};
