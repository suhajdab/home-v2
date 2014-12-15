require( 'es6-promise' ).polyfill();
var uuid = require('node-uuid');
var kue = require( 'kue' ),
	events = kue.createQueue({prefix:'home'});

var db = require( './database-layer.js' );
var settings = require( './settings.js' );


/* PRIVATE */
var providers = {}; // should come from redis
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
	tags.forEach( function ( tag ) {
		var arr = tag.split( ':' );
		if ( arr.length < 2 ) return;
		if ( arr[ 0 ] == 'room' && !~rooms.indexOf( arr[ 1 ] )) rooms.push( arr[ 1 ]);
		if ( arr[ 0 ] == 'zone' && !~zones.indexOf( arr[ 1 ] )) zones.push( arr[ 1 ]);
	});
	db.set( 'rooms', rooms );
	db.set( 'zones', zones );
}

function findDeviceByTag ( selector ) {
	var foundDevices = devices.filter( function ( device ) {
		return ~( device.tags || [] ).indexOf( selector );
	});

	console.log( 'found devices by tag ' + selector, foundDevices );
	return foundDevices;
}

function findDeviceById( id ) {
	for ( var i = 0, device; device = devices[ i ]; i++ ) {
		if ( device.id === id ) {
			console.log( 'found device by id ' + id, device );
			return [device];
		}
	}
	return false;
}

function deviceSelector ( selector ) {
	if ( ~selector.indexOf( ':') ) {
		return findDeviceByTag( selector );
	}
	else return findDeviceById( selector );
}

/**
 *
 * context = event.data
 * @param device
 */
function callService( device ) {
	try {
		providers[ device.provider ][ this.service ]( device.nativeId );
	} catch( err ) {
		console.error( err );
	}
}

function registerNewDevice ( device ) {
	// add home specific id to device
	device.id = uuid.v4();
	devices.push( device );
	db.set( 'devices', devices );
	if ( device.tags ) importTags ( device.tags );
}

function filterOutRegisteredDevices ( device ) {
	for ( d in devices ) {
		if ( devices[ d ].nativeId == device.nativeId && devices[ d ].provider == device.provider ) return false;
	}

	return true;
}

function registerNewDevices( deviceList ) {
	deviceList.filter( filterOutRegisteredDevices ).forEach( registerNewDevice );
}

function onRegistrationError ( err ) {
	console.error( 'onRegistrationError', err, this ); // TODO: error logging
}

function registerProviders ( providers ) {
	providers.forEach( registerProvider );
}

function registerProvider ( providerName ) {
	console.log( 'registering provider: ' + providerName );
	var currentProvider = providers[ providerName],
		providerSettings = settings( providerName ),
		globalSettings = settings( 'global' );

	if ( currentProvider ) return;

	currentProvider = require( './providers/' + providerName + '.js' );
	currentProvider.init( globalSettings, providerSettings );
	if ( currentProvider.getDevices ) {
		currentProvider
			.getDevices()
			.then( registerNewDevices )
			.catch( onRegistrationError.bind({ providerName: providerName }));
	}
	providers[ providerName] = currentProvider;
}

function registerNewProvider ( provider ) {
	registerProvider( provider );
	db.set( 'providers', Object.keys( providers ));
}

function ready () {
	//console.log( 'device.js ready', devices );
	events.process( 'action', onAction );

	//console.log( deviceSelector( 'room:Kitchen' ));
	setTimeout( function () {
		console.log( 'Turning on all devices tagged Kitchen' );
		onAction({ data: { deviceSelector: 'room:Kitchen', service:'on'}});
		//deviceSelector( 'room:Kitchen' ).forEach( function ( device ){
		//	providers[ device.provider ]['on']( device.nativeId );
		//	console.log( 'turning on', device)
		//});
	}, 2000 );
}

function init () {
	Promise.all([
		db.get( 'providers' ).then( registerProviders ),
		db.get( 'devices' ).then( function ( data ) { devices = data; } ),
		db.get( 'zones' ).then( function ( data ) { zones = data; } ),
		db.get( 'rooms' ).then( function ( data ) { rooms = data; } )
	]).then( ready );
}


function onAction( event, done ) {
	// TODO: untangle devices, tags and standardize statuses
	var data = event.data;
	var devices = deviceSelector( data.deviceSelector );
	console.log( 'onAction', data, devices );

	if ( devices ) devices.forEach( callService.bind( data ));
//	providers[ device.provider ][data.service]( device.nativeId );
	done && done();
}


init();