var db = require( './database-layer.js' ),
	objectAssign = require( 'object-assign' );
require( 'es6-promise' ).polyfill();

var settings;

function save() {
	return db.set( 'settings', settings );
}

function load() {
	return db.get( 'settings' ); // TODO: needs error handling
}

function configFactory( name ) {
	var api = {};

	// console.log( 'generating settings for ' + name );
	if ( typeof name !== 'string' ) return;
	settings[ name ] = settings[ name ] || {};

	api.get = function( key ) {
		return settings[ name ][ key ] || false;
	};

	// global are not to be tampered with by modules
	if ( name !== 'global' ) {
		api.set = function( key, value ) {
			settings[ name ][ key ] = value;
			save();
		};
	}

	return api;
}

function ready( data ) {
	settings = data || {};
}

function init() {
	load().then( ready );
}

init();

module.exports = configFactory;
