module.exports = function (grunt) {

	var DEBUG = !!grunt.option("debug");

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		concat: {
			noinfopath: {
				src: [
					'src/globals.js',
					'src/prompt.js',
					'src/forms.js',
					'src/form-service.js',
					'src/tabs.js',
					'src/navigation.js',
					'src/validation.js',
					'src/form-config.js',
					'src/no-data-manager.js'
				],
				dest: 'dist/noinfopath-forms.js'
			},
			readme: {
				src: ['docs/home.md'],
				dest: 'readme.md'
			},
			wikiHome: {
	            src: ['docs/globals.md'],
	            dest: 'docs/home.md'
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
			},
			wiki: {
	            options: {
	                src: 'src/*.js',
	                dest: 'docs/<%= pkg.shortName %>.md',
	                start: ['/*', '/**'],
	                multiDocs: {
	                    multiFiles: true,
	                    dest: "docs/"
	                }
	            }
	        }
		},
		watch: {
			files: ['src/*.js', 'test/*.spec.js'],
			tasks: ['compile']
		},
		shell: {
			wiki1: {
				command: [
					'cd ../wikis/<%= pkg.shortName %>.wiki',
					'pwd',
					'git stash',
					'git pull'
				].join(' && ')
			},
			wiki2: {
				command: [
					'cd ../wikis/<%= pkg.shortName %>.wiki',
					'pwd',
					'git add .',
					'git commit -m"Wiki Updated"',
					'git push'
				].join(' && ')
			}
		},
		copy: {
	        wiki: {
	            files: [
	                {
	                    expand: true,
	                    flatten: true,
	                    src: ['docs/*.md', '!docs/global.md'],
	                    dest: '../wikis/<%= pkg.shortName %>.wiki/'
	                }
	            ]
	        }
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
	grunt.loadNpmTasks('grunt-shell');



	//WikiWack!
	grunt.registerTask('document', ['concat:noinfopath', 'nodocs:wiki']);
	grunt.registerTask('wikiWack', ['shell:wiki1', 'concat:wikiHome', 'copy:wiki', 'shell:wiki2']);
	grunt.registerTask('updateWiki', ['document', 'wikiWack']);
	grunt.registerTask('release', ['bumpup', 'version', 'updateWiki']);

	//Default task(s).
	grunt.registerTask('build', ['bumpup', 'version', 'concat:noinfopath', 'nodocs:internal', 'concat:readme']);
	grunt.registerTask('unstable', ['bumpup', 'version', 'concat:noinfopath', 'nodocs:internal', 'concat:readme', 'concat:dexie']);
	grunt.registerTask('notest', ['concat:noinfopath', 'copy:test']);
	grunt.registerTask('uglytest', ['concat:noinfopath', 'uglify', 'karma:ugly']);
	grunt.registerTask('compile', [/*'karma:continuous',*/ 'concat:noinfopath']);
	grunt.registerTask('test', ['karma:unit']);
	grunt.registerTask('jenkins', ['karma:continuous']);

};
