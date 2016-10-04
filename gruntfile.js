module.exports = function(grunt) {

	var DEBUG = !!grunt.option("debug");

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		concat: {
			noinfopath: {
				src: [
					'src/globals.js',
					'src/forms.js',
					'src/form-service.js',
					'src/tabs.js',
					'src/navigation.js',
					'src/validation.js',
					'src/form-config.js',
					'src/parameter-parser.js'
				],
				dest: 'dist/noinfopath-forms.js'
			},
			readme: {
				src: ['docs/noinfopath-forms.md'],
				dest: 'readme.md'
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
		},
		nodocs: {
			"internal": {
				options: {
					src: 'dist/noinfopath-forms.js',
					dest: 'docs/noinfopath-forms.md',
					start: ['/*', '/**']
				}
			},
			"public": {
				options: {
					src: 'dist/noinfopath-forms.js',
					dest: 'docs/noinfopath-forms.md',
					start: ['/*']
				}
			}
		},
		watch: {
			files: ['src/*.js', 'test/*.spec.js'],
			tasks: ['compile']
		}
	});

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-bumpup');
    grunt.loadNpmTasks('grunt-version');
    grunt.loadNpmTasks('grunt-nodocs');


	//Default task(s).
    grunt.registerTask('build', ['bumpup', 'version', 'concat:noinfopath', 'nodocs:internal', 'concat:readme']);
    grunt.registerTask('unstable', ['bumpup', 'version', 'concat:noinfopath', 'nodocs:internal', 'concat:readme', 'concat:dexie']);
    grunt.registerTask('notest', ['concat:noinfopath', 'copy:test']);
    grunt.registerTask('uglytest', ['concat:noinfopath', 'uglify', 'karma:ugly']);
    grunt.registerTask('compile', ['karma:continuous', 'concat:noinfopath', 'nodocs:internal', 'concat:readme']);
    grunt.registerTask('document', ['concat:noinfopath', 'nodocs:internal', 'concat:readme']);
    grunt.registerTask('test', ['karma:unit']);
    grunt.registerTask('jenkins', ['karma:continuous']);

};
