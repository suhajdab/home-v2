require( 'es6-promise' ).polyfill();
var db = require( './database-layer.js' );

/*
	system data to be shared amongst devices

	geolocation
	units
 */

module.exports = {
	geolocation: {
		lat: 55.633701,
		long: 13.505829
	},
	units: 'metric'
};