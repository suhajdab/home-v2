'use strict';

var debug = require( 'debug' )( 'database-layer' );
var r = require( 'rethinkdb' );

var settings = {
		host: 'localhost',
		port: 28015,
		db: 'home'
	},
	hardcoded_key = '_db_hardcoded_key',
	connection, haveDB;

// TODO: db query to find last entry with certain attributes: r.db('home').table('events').orderBy(r.desc('timeStamp')).filter({color:{brightness:92}}).limit(1)

function connectDB( settings ) {
	if ( connection ) return Promise.resolve( true );
	else return new Promise( ( resolve, reject ) => {
		r.connect( settings, ( err, conn ) => {
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
	else return new Promise( ( resolve, reject ) => {
		r.dbList().contains( settings.db ).run( connection, ( err, contains ) => {
			debug( 'db ' + settings.db + ' exists: ', contains );
			if ( err ) reject( err );
			else {
				if ( contains ) {
					haveDB = true;
					resolve( true );
				} else {
					debug( 'creating db: ' + settings.db );
					r.dbCreate( settings.db ).run( connection, ( err, res ) => {
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
	return new Promise( ( resolve, reject ) => {
		r.tableList().contains( table ).run( connection, ( err, contains ) => {
			debug( 'table ' + table + ' exists: ', contains );
			if ( err ) reject( err );
			else {
				if ( contains ) {
					resolve( true );
				} else {
					debug( 'creating table: ' + table );
					r.tableCreate( table, {
						primaryKey: primaryKey || hardcoded_key
					} ).run( connection, ( err, res ) => {
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
	return new Promise( ( resolve, reject ) => {
		debug( 'inserting ', document, ' into ' + table );
		r.table( table ).insert( document, options ).run( connection, ( err, result ) => {
			if ( err ) reject( err );
			else resolve( result );
		} );
	} );
}

function select( table, key ) {
	return new Promise( ( resolve, reject ) => {
		debug( 'selecting ' + key + ' from ' + table );
		r.table( table ).get( key ).run( connection, ( err, result ) => {
			if ( err ) reject( err );
			else resolve( result );
		} );
	} );
}

function subscribe( table, callback ) {
	r.table( table ).changes().run( connection, callback );
}

function addTableSpecificApis( tablePromise, table, api ) {
	switch ( table ) {
		case 'events':
			api.getLastEventForProperty = ( property ) => {
				return tablePromise.then( () => {
					return new Promise( function( resolve, reject ) {
						r.db( 'home' ).table( 'events' ).orderBy( r.desc( 'timeStamp' ) ).filter( property ).limit( 1 ).run( connection, ( err, result ) => {
							if ( err ) reject( new Error( err ) );
							else resolve( result );
						} );
					} );
				} );
			};
	}
	return api;
}

function factory( table, primaryKey ) {
	var api = {},
		haveTable;

	function getTable() {
		debug( 'getTable', 'table: ' + table, 'haveTable: ' + haveTable );
		if ( haveTable ) return Promise.resolve( true );
		else return setupTable( table, primaryKey )
			.then( () => { haveTable = true; } );
	}

	function tablePromise() {
		return connectDB( settings )
			.then( selectDB )
			.then( getTable );
	}

	if ( typeof table !== 'string' ) return;
//	settings[ name ] = settings[ name ] || {};

	api.get = function( key ) {
		return tablePromise()
			.then( select.bind( null, table, key ) );
	};

	api.set = function( key, doc ) {
		debug( 'set', table, key, doc );
		if ( typeof doc !== 'object' ) return Promise.reject( 'doc should be an object' );
		doc[ hardcoded_key ] = key;

		return tablePromise()
			.then( insert.bind( null, table, doc ) );
	};

	api.insert = function( doc ) {
		if ( typeof doc !== 'object' ) return Promise.reject( 'doc should be an object' );

		return tablePromise()
			.then( insert.bind( null, table, doc ) );
	};

	api.subscribe = function( callback ) {
		return tablePromise()
			.then( subscribe.bind( null, table, callback ) );
	};

	api = addTableSpecificApis( tablePromise(), table, api );

	return api;
}

module.exports = factory;
