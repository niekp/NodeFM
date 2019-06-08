const gulp = require('gulp');
const sass = require('gulp-sass');
const browserSync = require('browser-sync').create();
const uglify = require('gulp-uglify');
const cssnano = require('gulp-cssnano');
const concat = require('gulp-concat');
const plumber = require('gulp-plumber');
const autoprefixer = require('gulp-autoprefixer');
const gls = require('gulp-live-server');

const browserSyncOptions = {
	proxy: "http://localhost:3000", // lokale locatie van het project
	notify: false
};

const browserSyncWatchFiles = [
	'public/scss/**/*.css',
	'public/js/functions.js',
];


gulp.task('sass', function() {
	return gulp.src('public/scss/**/*.scss') // Gets all files ending with .scss in app/scss and children dirs
	.pipe(plumber())
	.pipe(sass.sync())
	.pipe(concat('styles.css'))
	.pipe(cssnano())
	.pipe(plumber.stop())
	.pipe(gulp.dest('app/css'))
	.pipe(browserSync.reload({
		stream: true
	}))
});

gulp.task('compress', function () {
	return gulp.src('public/js/functions.js')
	.pipe(uglify())
	.pipe(concat('functions.min.js'))
	.pipe(gulp.dest('public/js'))
	.pipe(browserSync.reload({
		stream: true
	}))
});


gulp.task('serve', function() {
	//1. serve with default settings
	var server = gls('bin/www', { env: { DEFAULT: 'development' } });
    server.start();

	//use gulp.watch to trigger server actions(notify, start or stop)
    gulp.watch(['public/**/*.css', 'static/**/*.html'], function (file) {
        server.notify.apply(server, [file]);
    });
	
    gulp.watch('app.js', server.start.bind(server)); //restart my server

    // Note: try wrapping in a function if getting an error like `TypeError: Bad argument at TypeError (native) at ChildProcess.spawn`
    gulp.watch('app.js', function () {
        server.start.bind(server)()
    });
});


// Gulp watch syntax
gulp.task('watch', ['serve', 'browserSync'], function (){
	gulp.watch('public/scss/**/*.scss', ['sass']);
	// Reloads the browser whenever JS files change
	gulp.watch('public/js/functions.js', ['compress'], browserSync.reload);
});


gulp.task('browserSync', function() {
	browserSync.init(browserSyncWatchFiles, browserSyncOptions);
});
