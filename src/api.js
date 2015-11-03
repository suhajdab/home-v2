/**
 * API
 */
var kue = require('kue');
kue.createQueue({prefix:'home'});
kue.app.listen(3000);