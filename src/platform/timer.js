'use strict';

var debug = require( 'debug' )( 'timer' ),
	CronJob = require( 'cron' ).CronJob,
	uuid = require( 'node-uuid' ),
	deepFreeze = require( 'deep-freeze' ),
	db = require( './../database-layer.js' )( 'devices' );

var timers,
	emitter,
	signature = {
		events: {
			//tick
		},
		commands: {
			//starttimer
			//enable/disable timer
		}
	};

deepFreeze( signature );

// TODO: finish db conversion

/*
 Using cronTime to define timers
 url: https://github.com/ncb000gt/node-cron

 *: Seconds: 0-59
 *: Minutes: 0-59
 *: Hours: 0-23
 *: Day of Month: 1-31
 *: Months: 0-11
 *: Day of Week: 0-6


 var CronJob = require( 'cron' ).CronJob;
 var job = new CronJob( {
 cronTime: '00 30 11 * * 1-5',
 onTick: function() {
 // Runs every weekday (Monday through Friday)
 // at 11:30:00 AM. It does not run on Saturday
 // or Sunday.
 },
 start: false
 } );

 job.start() & job.stop()
 */

/**
 * Function returns Object containing only those properties specified in keys array
 * @param {Object} obj - Object to filter
 * @param {Array} keys - Array of keys to filter by
 * @returns {Object} - New object containing only specified properties
 */
function filterObject( obj, keys ) {
	var newObj = {};
	Object.keys( obj ).forEach( function( key ) {
		if ( ~keys.indexOf( key ) ) newObj[ key ] = obj[ key ];
	} );
	return newObj;
}

/**
 * Function removes circular references, keeping only required properties on timer objects
 * @param {Array} timers - Array of timer objects
 * @returns {Array}
 */
function sanitizeTimers( timers ) {
	var keys = [ 'label', 'cronTime', 'repeat', 'active', 'id' ];
	return timers.map( function( timer ) {
		return filterObject( timer, keys );
	} );
}

function triggerTimer() {
	console.log( 'timer triggered', this );
	// TODO: standard event format
	emitter.emit( 'event', {
		id: this.id,
		name: this.name,
		title: this.name + ' triggered',
		source: 'timer'
	} );

	if ( !this.repeat ) disable( this );
}

function save() {
	let sanitizedTimers = sanitizeTimers( timers );
	debug( 'save', sanitizedTimers );
	// TODO: error logging
	return db.set( 'timers', { array: sanitizedTimers } ).catch( console.error.bind( console ) );
}

function create( timer ) {
	debug( 'create', timer );
	timer.id = uuid.v4();
	timers.push( timer );
	setup( timer );
	save();
	return timer.id;
}

function setup( timer ) {
	debug( 'setup', timer );
	if ( !timer.enabled ) return;
	enable( timer );
}

function enable( timer ) {
	debug( 'enable', timer );
	timer.enabled = true;
	timer.cron = new CronJob( {
		cronTime: timer.cronTime,
		onTick: triggerTimer.bind( timer ),
		start: true
	} );
}

function disable( timer ) {
	timer.enabled = false;
	timer.cron.stop(); // is this even needed?
	delete timer.cron;
	save();
}

function ready( timerData ) {
	debug( 'ready', timerData );
	timers = timerData && timerData.array || [];
	timers.forEach( setup );

//	create( {
//		label: "Hubby's weekday alarm",
//		//	cronTime: "00 30 06 *  * 1-5",
//		cronTime: "00 48 08 *  * *",
//		repeat: true,
//		enabled: true
//	} );
}

function init( globalSettings, platformSettings, em ) {
	debug( 'init', arguments );
	emitter = em;
	db.get( 'timers' ).then( ready );
}

module.exports.init = init;
