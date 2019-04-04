var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var helmet = require('helmet')

var indexRouter = require('./routes/index');
var statsRouter = require('./routes/stats');
var settingsRouter = require('./routes/settings');

var db = require('./db.js');
var user = require('./models/user.js');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(helmet());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Inject local variables and connect the DB
function injectLocal(req, res, next){

  user.injectLocalVariables(req, res);
  
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

app.get('/*', injectLocal);
app.use('/settings', settingsRouter);

app.use('/', indexRouter);
app.use('/stats', statsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
