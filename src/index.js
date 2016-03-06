/**
 * HOME - bus
 */

const debug = require( 'debug' )( 'index' );
const cp = require( 'child_process' );

const scripts = [ 'api', 'rules', 'devices', 'log' ];
var forks = {};

function forkChild( name ) {
	debug( 'forkChild', name );
	forks[ name ] = cp.fork( `${__dirname}/${name}.js` );
}

function init() {
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
