/**
 * ALARM
 */

require( 'es6-promise' ).polyfill();
var CronJob = require('cron').CronJob;
var db = require( './../database-layer.js' );
var uuid = require('node-uuid');
var kue = require( 'kue' ),
	events = kue.createQueue({prefix:'home'});

/*
	Using cronTime to define alarms
	url: https://github.com/ncb000gt/node-cron


	 new CronJob('* * * * * *', function(){
	 	console.log('You will see this message every second');
	 }, null, true, "America/Los_Angeles");

		 Seconds: 0-59
		 Minutes: 0-59
		 Hours: 0-23
		 Day of Month: 1-31
		 Months: 0-11
		 Day of Week: 0-6


	 var CronJob = require('cron').CronJob;
	 var job = new CronJob({
		 cronTime: '00 30 11 * * 1-5',
		 onTick: function() {
			 // Runs every weekday (Monday through Friday)
			 // at 11:30:00 AM. It does not run on Saturday
			 // or Sunday.
		 },
		 start: false,
		 timeZone: "America/Los_Angeles"
	 });
	 job.start();
 */


var alarms = [];


function triggerAlarm () {
	console.log( 'alarm triggered', this );
	events.create( 'event', {
		id: this.id,
		name: this.name,
		title: this.name + ' triggered',
		source: 'alarm'
	}).priority('high' ).attempts(5).save();

	if ( !this.repeat ) deactivate( this );
}

function save() {
	return db.set( 'alarms', alarms );
}

function create ( alarm ) {
	alarm.id = uuid.v4();
	alarms.push ( alarm );
	// setup using cron has to be last as it has circular references and doesn't need to be saved to db
	save().then( function () { setup( alarm ); });
}

function setup ( alarm ) {
	if ( !alarm.active ) return;
	activate( alarm );
}

function activate ( alarm ) {
	alarm.active = true;
	alarm.cron = new CronJob({
		cronTime: alarm.cronTime,
		onTick  : triggerAlarm.bind( alarm ),
		start   : true
	});
}

function deactivate ( alarm ) {
	alarm.active = false;
	alarm.cron.stop(); // is this even needed?
	delete alarm.cron;
	save();
}

function ready ( alarmData ) {
	alarms = alarmData;
	alarms.forEach( setup );
}

function init () {
	db.get( 'alarms' ).then( ready );
}

/*create({
	//name: "Hubby's weekday sunrise",
	name: "Hubby's test alarm",
	//cronTime: "00 30 06 *  * 1-5",
	cronTime: "00 04 00 *  * 1-5",
	repeat: true,
	active: true
});
*/
init();