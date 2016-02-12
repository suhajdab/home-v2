'use strict';

require( 'es6-promise' ).polyfill();
var debug = require( 'debug' )( 'database-layer' );
var r = require( 'rethinkdb' ),
	objectAssign = require( 'object-assign' );

var settings = {
		host: 'localhost',
		port: 28015,
		db: 'home'
	},
	hardcoded_key = '_db_hardcoded_key',
	connection, haveDB;

function connectDB( settings ) {
	if ( connection ) return Promise.resolve( true );
	else return new Promise( function( resolve, reject ) {
		r.connect( settings, function( err, conn ) {
			if ( err ) reject( err );
			else {
				connection = conn;
				resolve( conn );
			}
		} );
	} );
}

function selectDB() {
	if ( haveDB ) return Promise.resolve( true );
	else return new Promise( function( resolve, reject ) {
		r.dbList().contains( settings.db ).run( connection, function( err, contains ) {
			debug( 'db ' + settings.db + ' exists: ', contains );
			if ( err ) reject( err );
			else {
				if ( contains ) {
					haveDB = true;
					resolve( true );
				} else {
					debug( 'creating db: ' + settings.db );
					r.dbCreate( settings.db ).run( connection, function( err, res ) {
						if ( err ) reject( err );
						else {
							haveDB = true;
							resolve( res );
						}
					} );
				}
			}
		} );
	} );
}

function setupTable( table, primaryKey ) {
	return new Promise( function( resolve, reject ) {
		r.tableList().contains( table ).run( connection, function( err, contains ) {
			debug( 'table ' + table + ' exists: ', contains );
			if ( err ) reject( err );
			else {
				if ( contains ) {
					resolve( true );
				} else {
					debug( 'creating table: ' + table );
					r.tableCreate( table, { primaryKey: primaryKey || hardcoded_key } ).run( connection, function( err, res ) {
						if ( err ) reject( err );
						else {
							resolve( true );
						}
					} );
				}
			}
		} );
	} );
}

function insert( table, document ) {
	var options = { conflict: 'update' };
	return new Promise( function( resolve, reject ) {
		debug( 'inserting ', document, ' into ' + table );
		r.table( table ).insert( document, options ).run( connection, function( err, result ) {
			if ( err ) reject( err );
			else resolve( result );
		} );
	} );
}

function select( table, key ) {
	return new Promise( function( resolve, reject ) {
		debug( 'selecting ' + key + ' from ' + table );
		r.table( table ).get( key ).run( connection, function( err, result ) {
			if ( err ) reject( err );
			else resolve( result );
		} );
	} );
}

function subscribe( table, callback ) {
	r.table( table ).changes().run( connection, callback );
}

function factory( table, primaryKey ) {
	var api = {},
		haveTable;

	function selectTable() {
		if ( haveTable ) return Promise.resolve( true );
		else return setupTable( table, primaryKey )
			.then( function() {
				haveTable = true;
			} );
	}

	if ( typeof table !== 'string' ) return;
//	settings[ name ] = settings[ name ] || {};

	api.get = function( key ) {
		return connectDB( settings )
			.then( selectDB )
			.then( selectTable )
			.then( select.bind( null, table, key ) );
	};

	api.set = function( key, doc ) {
		if ( typeof doc !== 'object' ) return Promise.reject( 'doc should be an object' );
		doc[ hardcoded_key ] = key;

		return connectDB( settings )
			.then( selectDB )
			.then( selectTable )
			.then( insert.bind( null, table, doc ) );
	};

	api.insert = function( doc ) {
		if ( typeof doc !== 'object' ) return Promise.reject( 'doc should be an object' );

		return connectDB( settings )
			.then( selectDB )
			.then( selectTable )
			.then( insert.bind( null, table, doc ) );
	};

	api.subscribe = function( callback ) {
		return connectDB( settings )
			.then( selectDB )
			.then( selectTable )
			.then( subscribe.bind( null, table, callback ) );
	};

	return api;
}

module.exports = factory;
