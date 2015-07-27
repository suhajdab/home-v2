var hookshot = require( 'hookshot' );

hookshot()
	.on( 'push', function onPush( info ) {
		'use strict';
		console.log( 'hookshot: ref ' + info.ref + ' was pushed.' );
	} );

hookshot( 'refs/heads/master', 'git pull' ).listen( 9095 );
