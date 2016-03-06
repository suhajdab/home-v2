/**
 * HOME - bus
 */

const debug = require( 'debug' )( 'index' );
const cp = require( 'child_process' );

const scripts = [ 'api', 'rules', 'devices', 'log' ];
var forks = {};

function filterOut( name, el ) {
	return name !== el;
}

function forkChild( name ) {
	debug( 'forkChild', name );
	forks[ name ] = cp.fork( `${__dirname}/${name}.js` );
	forks[ name ].on( 'message', forwardMessage.bind( null, name ) );
}

function forwardMessage( from, msg ) {
	const receivers = scripts.filter( filterOut.bind( null, from ) );
	receivers.forEach( ( name ) => {
		forks[ name ].send( msg );
	} );
	debug( 'forwardMessage', 'receivers: ' + JSON.stringify( receivers ), 'message: ' + JSON.stringify( msg ) );
}

function init() {
	debug( 'init' );

	scripts.forEach( forkChild );
}

//const n = cp.fork(`${__dirname}/child.js`);
//const n = cp.fork( 'child.js' );

//n.on( 'message', function( m ) {
//	console.log( 'PARENT got message:', m );
//} );
//
//n.send( { hello: 'world' } );

init();
