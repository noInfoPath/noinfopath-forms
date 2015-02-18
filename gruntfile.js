module.exports = function(grunt) {

  var DEBUG = !!grunt.option("debug");
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    markdox : {
      target : {
        files: [{
          src: 'noinfopath-validation.js',
          dest: 'README.md'
          }]
        }
      },
    watch: {
        dev: {
          files: ['src/*.*'],
          tasks: ['documentation'],
          options: {
            livereload: true
          }
        }
    },
    karma: {
      unit: {
        configFile: "karma.conf.js"
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-markdox');

  //Default task(s).
  grunt.registerTask('documentation', ['markdox']);
  grunt.registerTask('production', ['copy:production']);
  grunt.registerTask('development', ['copy:development']);
};