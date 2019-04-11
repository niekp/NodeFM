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

// Routers
var indexRouter = require('./routes/index');
var statsRouter = require('./routes/stats');
var settingsRouter = require('./routes/settings');

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
function injectLocal(req, res, next){

  user.injectLocalVariables(req, res);

  if (req.query.filter)
    res.locals.filter = req.query.filter;
  
  // Connect to the DB if it's closed.
  let username = user.getUsername(req);
  if (username && !db.isConnected(username)) {
    db.connect(username).then(function() {
      next();
    });

  } else {
    next();
  }
};

// First inject variables
app.get('/*', injectLocal);

// Setup the routes
app.use('/', indexRouter);
app.use('/settings', settingsRouter);
app.use('/stats', statsRouter);

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
