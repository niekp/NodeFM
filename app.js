// Dependencies
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var helmet = require('helmet');
var config = require('config');

// Setup express
var app = express();

// Needed for app setup
var db = require('./db.js');
var user = require('./models/user.js');
var spotify_helper = require('./models/spotify_helper.js');

// Routers
var indexRouter = require('./routes/index');
var securityRouter = require('./routes/security');
var statsRouter = require('./routes/stats');
var settingsRouter = require('./routes/settings');
var spotifyRouter = require('./routes/spotify');
var libraryRouter = require('./routes/library');

// Setup view engine pug
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Load helmet (some protection stuff)
app.use(helmet());

// Setup express settings
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Add moment and set it's locale
app.locals.moment = require('moment');
app.locals.moment.locale(config.has('locale') ? config.get('locale') : 'en_GB');

// Inject local variables and connect the DB
function injectLocal(req, res, next) {
	let promises = [];
	user.injectLocalVariables(req, res);
	promises.push(spotify_helper.injectLocalVariables(req, res));

	if (req.query.filter)
		res.locals.filter = req.query.filter;

	// Connect to the DB if it's closed.
	let username = user.getUsername(req);
	if (username && !db.isConnected(username)) {
		promises.push(db.connect(username))
	}

	Promise.all(promises).then(function (values) {
		next();
	}).catch(function () {
		next();
	})
};

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

// First inject variables
app.get('/*', injectLocal);
app.post('/*', injectLocal);

// Setup the routes
app.use('/', indexRouter);
app.use('/security', securityRouter);
app.use('/settings', settingsRouter);
app.use('/stats', statsRouter);
app.use('/spotify', spotifyRouter);
app.use('/library', libraryRouter);

// If no route is found create a 404
app.use(function(req, res, next) {
  next(createError(404));
});

// Setup error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
