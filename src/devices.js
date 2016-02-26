'use strict';

//require( 'es6-promise' ).polyfill();
var debug = require( 'debug' )( 'devices' ),
	uuid = require( 'node-uuid' ),
	objectAssign = require( 'object-assign' ),

	settingsDB = require( './database-layer.js' )( 'settings' ),
	devicesDB = require( './database-layer.js' )( 'devices' ),
	eventsDB = require( './database-layer.js' )( 'events', 'id' ),

	signature = {
		settings: {
			geolocation: {
				type: 'object',
				properties: {
					lat: {
						type: 'float'
					},
					long: {
						type: 'float'
					}
				}
			},
			platforms: {
				type: 'object',
				properties: {
					forecast: {
						type: 'boolean'
					},
					hue: {
						type: 'boolean'
					},
					lifx: {
						type: 'booleam'
					},
					sunPhases: {
						type: 'boolean'
					},
					verisure: {
						type: 'boolean'
					}
				}
			},
			units: {
				type: 'string',
				enum: [ 'imperial', 'metric' ]
			}
		}
	},

/* PRIVATE */
	platforms = {},
	devices,
	rooms,
	zones,
	remoteApi,
	remoteApiServer;

// TODO: discover new devices
// TODO: lacking required settings, request user to enter, then re-init platform
// TODO: add listeners to devices
// TODO: devices should have signatures, not platform

/**
 * Read new room and zone tags, and store unique in db
 * @param {Array} tags
 */
function importTags( tags ) {
	tags.forEach( function( tag ) {
		var arr = tag.split( ':' );
		if ( arr.length < 2 ) {
			return;
		}
		if ( arr[ 0 ] === 'room' && !~rooms.indexOf( arr[ 1 ] ) ) {
			rooms.push( arr[ 1 ] );
		}
		if ( arr[ 0 ] === 'zone' && !~zones.indexOf( arr[ 1 ] ) ) {
			zones.push( arr[ 1 ] );
		}
	} );
	devicesDB.set( 'rooms', { array: rooms } );
	devicesDB.set( 'zones', { array: zones } );
}

function findDeviceByTag( selector ) {
	var foundDevices = devices.filter( function( device ) {
		return ~( device.tags || [] ).indexOf( selector );
	} );

	debug( 'findDeviceByTag ' + selector, foundDevices );
	return foundDevices;
}

function findDeviceById( id ) {
	for ( var i = 0, device; ( device = devices[ i ] ); i++ ) {
		if ( device.id === id ) {
			debug( 'findDeviceById ' + id, device );
			return [ device ];
		}
	}
	return false;
}

function findDeviceByNativeId( id ) {
	for ( var i = 0, device; ( device = devices[ i ] ); i++ ) {
		if ( device.nativeId === id ) {
			debug( 'findDeviceByNativeId ' + id, device );
			return device;
		}
	}
	return false;
}

function findDevice( selector ) {
	if ( ~selector.indexOf( ':' ) ) {
		return findDeviceByTag( selector );
	}
	else {
		return findDeviceById( selector );
	}
}

function concatDevices( accum, sel ) {
	var found = findDevice( sel );

	if ( found ) {
		return accum.concat( found );
	} else {
		return accum;
	}
}

function deviceSelector( selector ) {
	if ( Array.isArray( selector ) ) {
		return selector.reduce( concatDevices, [] );
	} else {
		return findDevice( selector );
	}
}

function sanitizeDeviceData( deviceData ) {
	var sanitizedData = {
		id: uuid.v4(),
		nativeId: deviceData.nativeId,
		platform: deviceData.platform,
		label: deviceData.label,
		type: deviceData.type
	};
	Object.freeze( sanitizedData );
	return sanitizedData;
}

function registerNewDevice( device ) {
	// add home specific id to device
	devices.push( sanitizeDeviceData( device ) );
	devicesDB.set( 'devices', { array: devices } );
	if ( device.tags ) {
		importTags( device.tags );
	}
}

function filterOutRegisteredDevices( device ) {
	for ( var d in devices ) {
		if ( devices[ d ].nativeId === device.nativeId && devices[ d ].platform === device.platform ) {
			return false;
		}
	}
	return true;
}

function registerNewDevices( deviceList ) {
	deviceList.filter( filterOutRegisteredDevices ).forEach( registerNewDevice );
}

function onRegistrationError( err ) {
	console.error( 'onRegistrationError', this, err ); // TODO: error logging
}

function generateEmitter( platformName ) {
	function emit( data ) {
		// TODO: connect with rules & rest of scripts
		var defaultData = {
				timeStamp: Date.now(),
				platform: platformName
			},
			eventData = objectAssign( {}, data, defaultData );

		eventsDB.insert( eventData );
		if ( !findDeviceByNativeId( data.nativeId ) ) {
			registerNewDevice( eventData );
		}
	}

	return {
		emit: emit
	};
}

// TODO: validate loaded settings with platform requirements
function validateSettings( args ) {
	return Promise.resolve( args );
}

function registerPlatform( platformName ) {
	if ( platforms[ platformName ] ) return;
	debug( 'registerPlatform', new Date().toTimeString() + ' : ' + platformName );

	var platformSettings = settingsDB.get( platformName ),
		globalSettings = settingsDB.get( 'global' ),// TODO: get once!
		module = require( './platform/' + platformName + '.js' );

	Promise.all( [ platformName, module, globalSettings, platformSettings ] )
		.then( validateSettings )
		.then( initPlatform );
}

function initPlatform( args ) {
	var platformName = args[ 0 ],
		module = args[ 1 ],
		globalSettings = args[ 2 ],
		platformSettings = args[ 3 ],
		emitter = generateEmitter( platformName );

	module.init( globalSettings, platformSettings || {}, emitter );
	platforms[ platformName ] = module;
}

function registerNewPlatform( platform ) {
	registerPlatform( platform );
//	devicesDB.set( 'platforms', { array: Object.keys( platforms ) } );
}

function onAction( event ) {
	// TODO: untangle devices, tags and standardize statuses
	var data = event.data;
	debug( 'onAction', data );
	var device = deviceSelector( data.deviceSelector );
//	platforms[ device.platform ][ data.command ]( device.nativeId );
	platforms[ device.platform ].command.apply( this, Array.concat( data.command, data.params ) );
}

function triggerCommand( command, params, device ) {
	platforms[ device.platform ].command.call( this, [ command, params ] );
}

/* remote api */
remoteApi = {
	trigger: function( selector, command, params ) {
		var targetDevices = deviceSelector( selector );
		if ( !targetDevices ) return; // TODO: error
		targetDevices.forEach( triggerCommand.bind( null, command, params ) );
	},
	getPlatforms: function( callback ) {
		callback( platforms );
	},
	getDevices: function( callback ) {
		callback( devices );
	}
};

/* init */
function ready( args ) {
	// TODO: refactor ASA ES6
	if ( process.env.PLATFORMS ) {
		debug( 'ready in ', 'process.env.PLATFORMS override: ' + process.env.PLATFORMS );
		var platforms = process.env.PLATFORMS.split( ',' );
		devices = [];
		zones = [];
		rooms = [];
	} else {
		debug( 'ready in', args );
		var platforms = args[ 0 ] ? args[ 0 ].array : [];
		devices = args[ 1 ] ? args[ 1 ].array : [];
		zones = args[ 2 ] ? args[ 2 ].array : [];
		rooms = args[ 3 ] ? args[ 3 ].array : [];
	}
	platforms.forEach( registerPlatform );
	debug( 'ready out', 'platforms = ' + JSON.stringify( platforms ), 'devices = ' + JSON.stringify( devices ), 'zones = ' + JSON.stringify( zones ), 'rooms = ' + JSON.stringify( rooms ) );
}

function init() {
	Promise.all( [
		devicesDB.get( 'platforms' ),
		devicesDB.get( 'devices' ),
		devicesDB.get( 'zones' ),
		devicesDB.get( 'rooms' )
	] ).then( ready );

	debug( 'init' );
}

init();
