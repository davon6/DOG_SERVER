var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var dotenv = require('dotenv');
dotenv.config();

var indexRouter = require('./routes/index');
var userRoutes = require('./routes/userRoutes');

var app = express();

// Middleware setup
app.use(logger('dev'));
app.use(express.json());  // Needed to parse JSON bodies
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routes setup
app.use('/', indexRouter);
app.use('/users', userRoutes);  // Make sure this is included in your routes setup
app.use('/user', userRoutes);  // Use the /user route for anything in userRoutes

app.use((req, res, next) => {
  console.log(`Request method: ${req.method}, URL: ${req.url}`);
  next();
});

// Catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

app.listen(3000, '0.0.0.0', () => {
  console.log('Server is running on port 3000 and accessible from any network interface');
});

module.exports = app;
