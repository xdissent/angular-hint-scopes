module.exports = function(config) {
  config.set({
    frameworks: ['browserify', 'jasmine'],
    files: [
      'bower_components/angular/angular.js',
      'bower_components/angular-mocks/angular-mocks.js',
      'hint-scopes.js',
      '*_test.js'
    ],
    exclude: [],
    preprocessors: {
      'hint-scopes.js': [ 'browserify' ]
    },
    browsers: ['Chrome'],
    browserify: {
      debug: true
    }
  });
};
