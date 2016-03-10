'use strict';

var debug = require( 'debug' )( 'validate-platform-command' );

var validatePlatformCommand = ( function( undefined ) {

	// type tests
	function isBoolean( v ) {
		return typeof v === 'boolean';
	}

	function isString( v ) {
		return typeof v === 'string';
	}

	// end type tests

	function getCommandSignature( signature, command ) {
		return signature.commands[ command ];
	}

	function isValidArg( prop, arg ) {
		if ( !prop.type ) return new Error( 'missing property type' );

		switch ( prop.type ) {
			case 'string':
				return isString( arg );
			case 'boolean':
				return isBoolean( arg );
			case 'number':
				if ( isNaN( arg ) ) return false;
				break;
		}
		if ( prop.maximum && arg > prop.maximum ) return false;
		if ( prop.minimum && arg < prop.minimum ) return false;

		return true;
	}

	function getInvalidArgs( commandSignature, args ) {
		var missingArgs = [], invalidArgs = [];

		if ( commandSignature.type == 'object' ) {
			var propKeys = Object.keys( commandSignature.properties );
			// TODO: validate required: any
			propKeys.forEach( ( prop ) => {
				let commandProps = commandSignature.properties[ prop ];
				// check if required & defined
				if ( commandProps.required === true && args[ prop ] === undefined ) missingArgs.push( prop );
				// check if defined & valid
				if ( args[ prop ] !== undefined && !isValidArg( commandProps, args[ prop ] ) ) invalidArgs.push( prop );
				debug( 'propKey loop', prop, commandProps, args[prop] );
			} );

			return missingArgs.length || invalidArgs.length ? [ missingArgs, invalidArgs ] : false;
		}
	}

	function validator( signature, command, commandArgs ) {
		debug( 'validator', 'signature: ',signature, 'command: ', command, 'commandArgs: ',commandArgs );
		return new Promise( function( resolve, reject ) {
			var commandSignature = getCommandSignature( signature, command );

			if ( !commandSignature ) reject( new Error( `Command "${command}" not found!` ) );
			else {
				let invalidArgs = getInvalidArgs( commandSignature, commandArgs );
				if ( invalidArgs ) reject( new Error( `Command "${command}" failed validation! Missing required arguments: ${invalidArgs[ 0 ].join( ', ' )}. Invalid arguments: ${invalidArgs[ 1 ].join( ', ' )}.` ) );
				else resolve( [ command, commandArgs ] );
			}
		} );
	}

	return validator;
})();

module.exports = validatePlatformCommand;
