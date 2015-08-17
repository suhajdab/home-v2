require( 'es6-promise' ).polyfill();
var uuid = require('node-uuid' ),
	kue = require( 'kue' );

var db = require( './database-layer.js' );
var settings = require( './settings.js' );

var events = kue.createQueue( { prefix: 'home' } );


/* PRIVATE */
var platforms = {}; // should come from redis
var devices = [],
	rooms = [],
	zones = [];

// TODO: discover new devices

/* TODO: add listeners to devices

 events.create( 'event', {
	 id    : this.id,
	 name  : this.name,
	 title : this.name + ' triggered',
	 source: 'timer'
 }).save();
 */

/**
 * Read new room and zone tags, and store unique in db
 * @param {Array} tags
 */
function importTags ( tags ) {
	'use strict';

	tags.forEach( function ( tag ) {
		var arr = tag.split( ':' );
		if ( arr.length < 2 ) {
			return;
		}
		if ( arr[ 0 ] === 'room' && !~rooms.indexOf( arr[ 1 ] )) {
			rooms.push( arr[ 1 ]);
		}
		if ( arr[ 0 ] === 'zone' && !~zones.indexOf( arr[ 1 ] )) {
			zones.push( arr[ 1 ]);
		}
	});
	db.set( 'rooms', rooms );
	db.set( 'zones', zones );
}

function findDeviceByTag ( selector ) {
	'use strict';

	var foundDevices = devices.filter( function ( device ) {
		return ~( device.tags || [] ).indexOf( selector );
	});

	console.log( 'found device by tag ' + selector, foundDevices );
	return foundDevices;
}

function findDeviceById( id ) {
	'use strict';

	for ( var i = 0, device; (device = devices[ i ]); i++ ) {
		if ( device.id === id ) {
			console.log( 'found device by id ' + id, device );
			return device;
		}
	}
	return false;
}

function deviceSelector ( selector ) {
	'use strict';

	if ( ~selector.indexOf( ':') ) {
		return findDeviceByTag( selector );
	}
	else {
		return findDeviceById( selector );
	}
}

function registerNewDevice ( device ) {
	'use strict';

	// add home specific id to device
	device.id = uuid.v4();
	devices.push( device );
	db.set( 'devices', devices );
	if ( device.tags ) {
		importTags ( device.tags );
	}
}

function filterOutRegisteredDevices ( device ) {
	'use strict';

	for ( var d in devices ) {
		if ( devices[ d ].nativeId === device.nativeId && devices[ d ].platform === device.platform ) {
			return false;
		}
	}
	return true;
}

function registerNewDevices( deviceList ) {
	'use strict';

	deviceList.filter( filterOutRegisteredDevices ).forEach( registerNewDevice );
}

function onRegistrationError ( err ) {
	'use strict';

	console.error( 'onRegistrationError', this, err ); // TODO: error logging
}

function registerPlatform ( platformName ) {
	'use strict';

	console.log( (new Date()).toTimeString() + 'registering platform: ' + platformName );
	var currentPlatform = platforms[ platformName],
		platformSettings = settings( platformName ),
		globalSettings = settings( 'global' );

	if ( currentPlatform ) {
		return;
	}

	currentPlatform = require( './platform/' + platformName + '.js' );
	currentPlatform.init( globalSettings, platformSettings );
	if ( currentPlatform.getDevices ) {
		currentPlatform
			.getDevices()
			.then( registerNewDevices )
			.catch( onRegistrationError.bind({ platformName: platformName }) );
	}
	platforms[ platformName] = currentPlatform;
}

function registerPlatforms ( platforms ) {
	'use strict';

	platforms.forEach( registerPlatform );
}

function registerNewPlatform ( platform ) {
	'use strict';

	registerPlatform( platform );
	db.set( 'platforms', Object.keys( platforms ));
}

function onAction( event, done ) {
	'use strict';

	// TODO: untangle devices, tags and standardize statuses
	var data = event.data;
	console.log( 'onAction', data );
	var device = deviceSelector( data.deviceSelector );
	platforms[ device.platform ][data.service]( device.nativeId );
	done();
}

function ready () {
	'use strict';

	//console.log( 'device.js ready', devices );
	events.process( 'action', onAction );

	//console.log( deviceSelector( 'room:Kitchen' ));
	/*setTimeout( function () {
		console.log( 'Turning on all devices tagged Kitchen' );
		deviceSelector( 'room:Kitchen' ).forEach( function ( device ){
			platform[ device.platform ]['on']( device.nativeId );
			console.log( 'turning on', device)
		});
	}, 2000 );*/
}

function init () {
	'use strict';

	Promise.all([
		db.get( 'platforms' ).then( registerPlatforms ),
		db.get( 'devices' ).then( function ( data ) { devices = data; } ),
		db.get( 'zones' ).then( function ( data ) { zones = data; } ),
		db.get( 'rooms' ).then( function ( data ) { rooms = data; } )
	]).then( ready );
}



init();
