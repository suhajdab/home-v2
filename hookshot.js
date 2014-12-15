var hookshot = require( 'hookshot' );


hookshot()
	.on( 'push', function( info ) {
		console.log( 'hookshot: ref ' + info.ref + ' was pushed.' )
	});

hookshot( 'refs/heads/tmp', 'git pull' ).listen( 9095 );