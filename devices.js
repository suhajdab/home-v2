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
		if ( devices[ d ].nativeId === device.nativeId && devices[ d ].provider === device.provider ) {
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

function registerProvider ( providerName ) {
	'use strict';

	console.log( (new Date()).toTimeString() + 'registering provider: ' + providerName );
	var currentProvider = platforms[ providerName],
		providerSettings = settings( providerName ),
		globalSettings = settings( 'global' );

	if ( currentProvider ) {
		return;
	}

	currentProvider = require( './platform/' + providerName + '.js' );
	currentProvider.init( globalSettings, providerSettings );
	if ( currentProvider.getDevices ) {
		currentProvider
			.getDevices()
			.then( registerNewDevices )
			.catch( onRegistrationError.bind({ providerName: providerName }) );
	}
	platforms[ providerName] = currentProvider;
}

function registerProviders ( providers ) {
	'use strict';

	providers.forEach( registerProvider );
}

function registerNewProvider ( provider ) {
	'use strict';

	registerProvider( provider );
	db.set( 'platforms', Object.keys( platforms ));
}

function onAction( event, done ) {
	'use strict';

	// TODO: untangle devices, tags and standardize statuses
	var data = event.data;
	console.log( 'onAction', data );
	var device = deviceSelector( data.deviceSelector );
	platforms[ device.provider ][data.service]( device.nativeId );
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
			platform[ device.provider ]['on']( device.nativeId );
			console.log( 'turning on', device)
		});
	}, 2000 );*/
}

function init () {
	'use strict';

	Promise.all([
		db.get( 'platforms' ).then( registerProviders ),
		db.get( 'devices' ).then( function ( data ) { devices = data; } ),
		db.get( 'zones' ).then( function ( data ) { zones = data; } ),
		db.get( 'rooms' ).then( function ( data ) { rooms = data; } )
	]).then( ready );
}



init();
