require('es6-promise').polyfill();
var redis = require( 'redis' ).createClient();

function set ( key, value ) {
	var json = JSON.stringify( value );

	return new Promise( function ( resolve, reject ) {
		redis.set( key, json, function ( err, response ) {
			if ( err ) {
				reject( err );
			} else {
				resolve( response );
			}
		});
	});

}

function get ( key ) {
	return new Promise( function ( resolve, reject ) {
		redis.get( key, function ( err, response ) {
			if ( err ) {
				reject( err );
			} else {
				resolve( JSON.parse( response ));
			}
		});
	});
}

module.exports = {
	set: set,
	get: get
};