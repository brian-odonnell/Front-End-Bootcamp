module.exports = function (grunt) {
	'use strict';
	// Project configuration
	grunt.initConfig({
		// Metadata
		pkg: grunt.file.readJSON('package.json'),
		banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
			'<%= grunt.template.today("yyyy-mm-dd") %>\n' +
			'<%= pkg.homepage ? "* " + pkg.hompage + "\\n" : "" %>' +
			'* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
			' Licensed <%= props.license %> */\n',
		// Task configuration
		concat: {
			dist: {
				src: [
					'js/lib/hbs.js',
					'js/lib/underscore.js'
				],
				dest: 'js/libs.js'
			}
		},
		connect: {
			server: {
				options: {
					port: 3000,
					hostname: '*',
					keepalive: true,
					livereload: true
				}
			}
		},
		uglify: {
			dist: {
				src: '<%= concat.dist.dest %>',
				dest: 'js/libs.min.js'
			}
		},
		jshint: {
			options: {
				node: true,
				curly: true,
				eqeqeq: true,
				immed: true,
				latedef: true,
				newcap: true,
				noarg: true,
				sub: true,
				undef: true,
				unused: true,
				eqnull: true,
				browser: true,
				globals: { jQuery: true },
				boss: true
			},
			gruntfile: {
				src: 'gruntfile.js'
			},
			lib_test: {
				src: ['lib/**/*.js', 'test/**/*.js']
			}
		},
		qunit: {
			files: ['test/**/*.html']
		},
		watch: {
			gruntfile: {
				files: '<%= jshint.gruntfile.src %>',
				tasks: ['jshint:gruntfile']
			},
			lib_test: {
				files: '<%= jshint.lib_test.src %>',
				tasks: ['jshint:lib_test', 'qunit']
			},
			less: {
				files: 'css/less/*.less',
				tasks: ['less'],
				options: {
					livereload: true
				}
			}
		},
		less: {
			development: {
				files: {
					"css/main.css": "css/less/main.less"
				},
				options: {
					compress: true
				}
			}
		}
	});

	// These plugins provide necessary tasks
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-qunit');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-connect');
	grunt.loadNpmTasks('grunt-contrib-less');

	// Default task
	grunt.registerTask('default', ['jshint', 'qunit', 'concat', 'uglify']);
	grunt.registerTask('jsmin', ['concat', 'uglify']);
};

