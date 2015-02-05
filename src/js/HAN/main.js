/**
 * @requires HBS
 */
(function() {
	/**
	 * @exports HAN.main
	 */
	var module = {};

	/**
	 * Global init code for the whole application
	 */
	module.init = function() {
		// Add any code you need to run on the page here
	};

	/**
	 * Initialize the app and run the bootstrapper
	 */
	$(document).ready(function() {
		module.init();
	});
	HBS.namespace('HAN.main', module);
}());
