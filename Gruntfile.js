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
				dest: 'js/lib/libs.js'
			}
		},
		connect: {
			server: {
				options: {
					port: 3000,
					keepalive: true,
					livereload: true,
					base: 'build/',
					hostname: '*'
				}
			}
		},
		copy: {
			html: {
				files: [{
					expand: true,
					cwd: 'src/',
					src: ['*.html'],
					dest: 'build/'
				}]
			},
			img: {
				files: [{
					expand: true,
					cwd: 'src/img/',
					src: ['**'],
					dest: 'build/img/'
				}]
			},
			js: {
				files: [{
					expand: true,
					cwd: 'src/js/',
					src: ['**'],
					dest: 'build/js/'
				}]
			}
		},
		watch: {
			less: {
				files: ['src/**/*.less'],
				tasks: ['less'],
				options: { livereload: true }
			},
			html: {
				files: ['src/**/*.html'],
				tasks: ['copy:html'],
				options: { livereload: true }
			},
			js: {
				files: ['src/**/*.js'],
				tasks: [
					'concat', 'copy:js'
				],
				options: { livereload: true }
			},
			img: {
				files: ['src/**/*.{jpg|png}'],
				tasks: [
					'copy:img'
				]
			}
		},
		less: {
			development: {
				files: {
					"build/css/main.css": "src/less/main.less"
				},
				options: {
					compress: true
				}
			}
		}
	});

	// These plugins provide necessary tasks
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-connect');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-contrib-watch');

	// Default task
	grunt.registerTask('default', ['less', 'concat', 'copy']);
};

