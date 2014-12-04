require( 'es6-promise' ).polyfill();

// Require the module
var Forecast = require('forecast');

// Initialize
var forecast = new Forecast({
	service: 'forecast.io',
	key: 'e336357b6655bd7377db35998b848b9d',
	units: 'celcius', // Only the first letter is parsed
	cache: true,      // Cache API requests?
	ttl: {            // How long to cache requests. Uses syntax from moment.js: http://momentjs.com/docs/#/durations/creating/
		minutes: 30
	}
});

var cachedData = {},
	subscriber = function () { console.log( arguments ); };

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
	Object.keys( obj ).forEach( function ( key ) {
		if ( ~keys.indexOf( key )) newObj[ key ] = obj[ key ];
	});
	return newObj;
}

// read location data from system.js
function fetchWeatherData() {
	return new Promise( function ( resolve, reject ) {
		forecast.get([ 55.633701, 13.505829 ], true, function( err, weather ) {
			if( err) reject( err );
			else resolve( weather );
		});
	});
}

function storeData ( data ) {
	console.log( 'data expires: ' + new Date(data.expires));
	if ( isWeatherChanged( cachedData, data )) subscriber( filterObject( data, [ 'currently' ] ));
	cachedData = data;
	return Promise.resolve( true );
}

function log ( obj ) {
	console.log(JSON.stringify( obj, null, "\t" ));
}

function waitAndRefresh () {
	var timeout = cachedData.expires - Date.now();
	console.log( 'waiting: ' + Math.round(timeout/60000) + ' minutes until data expires on: ' + new Date(cachedData.expires));
	setTimeout( getData, timeout );
}

function getData () {
	// TODO: error handling should try again
	fetchWeatherData().then( storeData ).then( waitAndRefresh ).catch( log );
}

function on ( callback ) {
	// does it need more subscribers?? devices.js might be the only one
	subscriber = callback;
}

function init () {
	getData();
}

init();



module.exports = {
	on: on
};