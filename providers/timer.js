/**
 * timer
 */

require( 'es6-promise' ).polyfill();
var CronJob = require( 'cron' ).CronJob;
var db = require( './../database-layer.js' );
var uuid = require( 'node-uuid' );
var kue = require( 'kue' ),
	events = kue.createQueue({ prefix: 'home' });


var timers = [];

/*
	Using cronTime to define timers
	url: https://github.com/ncb000gt/node-cron

	 *: Seconds: 0-59
	 *: Minutes: 0-59
	 *: Hours: 0-23
	 *: Day of Month: 1-31
	 *: Months: 0-11
	 *: Day of Week: 0-6


	 var CronJob = require('cron').CronJob;
	 var job = new CronJob({
		 cronTime: '00 30 11 * * 1-5',
		 onTick: function() {
			 // Runs every weekday (Monday through Friday)
			 // at 11:30:00 AM. It does not run on Saturday
			 // or Sunday.
		 },
		 start: false
	 });

	 job.start() & job.stop()
 */


function triggerTimer () {
	console.log( 'timer triggered', this );
	events.create( 'event', {
		id: this.id,
		name: this.name,
		title: this.name + ' triggered',
		source: 'timer'
	}).priority( 'high' ).attempts( 5 ).save();

	if ( !this.repeat ) deactivate( this );
}

function save() {
	return db.set( 'timers', timers );
}

function create ( timer ) {
	timer.id = uuid.v4();
	timers.push ( timer );
	// setup using cron has to be last as it has circular references and doesn't need to be saved to db
	save().then( function () { setup( timer ); }); // TODO: curry?
	return timer.id
}

function setup ( timer ) {
	if ( !timer.active ) return;
	activate( timer );
}

function activate ( timer ) {
	timer.active = true;
	timer.cron = new CronJob({
		cronTime: timer.cronTime,
		onTick: triggerTimer.bind( timer ),
		start: true
	});
}

function deactivate ( timer ) {
	timer.active = false;
	timer.cron.stop(); // is this even needed?
	delete timer.cron;
	save();
}

function ready ( timerData ) {
	timers = timerData;
	timers.forEach( setup );
}

function init () {
	db.get( 'timers' ).then( ready );
}

/*
create({
	name: "Hubby's weekday sunrise",
	cronTime: "00 30 06 *  * 1-5",
	repeat: true,
	active: true
});
*/
init();