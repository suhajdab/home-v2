var CronJob = require( 'cron' ).CronJob;
var kue = require('kue' ),
	events = kue.createQueue({prefix:'home'});

//  calculate sun phases based on day & loc
var suncalc = require( 'suncalc' );

var geolocation, jobs = [];



// TODO: subscribe to location update

/**
 * Function pushes an event to the message queue. Data is passed to it by setting context
 */
function triggerEvent() {
	console.log( 'trigger sun phase event', this );
	events.create( 'event', {
		state: this.name,
		title: phase + ' triggered',
		source: 'sun-phase'
	}).save();
}

/**
 * Function creates a cron job out of an event
 * @param {Object} event - Data for cron job creation, also context for triggered event
 * @param {String} event.name - Name of event to be created
 * @param {Date} event.date - Date object
 */
function addCronJob( event ) {
	console.log( 'adding sun phase cron job', event );
	jobs.push( new CronJob({
		cronTime: event.date,
		onTick: triggerEvent,
		start: true,
		context: event
	}));
}

/**
 * Function loops through sun phases object to create cron jobs
 * @param {Object} events - phase names are keys, phase dates are values
 */
function generateCronJobs ( events ) {
	var now = new Date();
	for ( var eventName in events ) {
		if ( events[ eventName ] > now ) addCronJob({ name: eventName, date: events[ eventName ] });
	}

	// test event 5 sec in the future
	//addCronJob({ name: 'test event', date: new Date( Date.now() + 5 * 1000 ) });
}

/**
 * Function sets off the generation of cron jobs taking the sun phase objects provided by suncalc
 */
function setupCronJobs () {
	var sunPhases = suncalc.getTimes( Date.now(), geolocation.lat, geolocation.long );
	generateCronJobs( sunPhases );
}

function ready () {
	console.log( 'sunPhases ready.' );
	setupCronJobs();
}

/**
 * Function sets up a repeating cron job to generate sun phase jobs each day, and does generation for current day
 */
function init ( globalSettings, providerSettings ) {
	console.log( arguments );
	geolocation = globalSettings.get( 'geolocation' );

	// cron job to regenerate sun phase crons every day
	jobs.push( new CronJob({
		cronTime: '00 00 00 * * *',
		onTick: setupCronJobs,
		start: true
	}));

	ready();
}

module.exports.init = init;