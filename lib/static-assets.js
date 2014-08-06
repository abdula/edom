module.exports = function(options, edom) {
    var adapter = options.adapter;
    if (!adapter) {
        adapter = 'fs';
    }
    var AssetsManager = require('./static-assets/' + adapter);
    delete options.adapter;
    return new AssetsManager(options, edom);
};
