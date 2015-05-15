module.exports = function(grunt) {

    var DEBUG = !!grunt.option("debug");

    // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
      concat: {
        noinfopath: {
            src: [
              'src/globals.js',
              'src/validation.js',
              'src/forms.js'
            ],
            dest: 'dist/noinfopath-forms.js'
        }
    },
        karma: {
          unit: {
            configFile: "karma.conf.js"
          },
          continuous: {
            configFile: 'karma.conf.js',
            singleRun: true,
            browsers: ['PhantomJS']
          }
        },
        bumpup: {
          file: 'package.json'
      },
      version: {
        options: {
            prefix: '@version\\s*'
          },
        defaults: {
          src: ['src/globals.js']
        }
      }   
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-bumpup');
  grunt.loadNpmTasks('grunt-version');
 
  //Default task(s).
  grunt.registerTask('build', ['bumpup','version','karma:continuous', 'concat:noinfopath']);

};