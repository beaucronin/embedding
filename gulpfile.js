var gulp = require('gulp');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var babel = require('gulp-babel');
var concat = require('gulp-concat');

var DEST = 'build/';

gulp.task('default', function() {
  return gulp.src('src/**/*.js')
    // This will output the non-minified version
    .pipe(concat('embedding.js'))
    .pipe(gulp.dest(DEST))
    .pipe(babel({
            presets: ['es2015']
        }))
    .pipe(uglify())
    // This will minify and rename to foo.min.js
    .pipe(rename({ extname: '.min.js' }))
    .pipe(gulp.dest(DEST));
});
