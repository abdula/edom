var path = require('path');

module.exports = function(patterns, values) {
    return function(processor) {
        var l = patterns.length;
        var replace = function(next, html, node, context) {
            for (var i = 0; i < l; i++) {
                html = html.replace(patterns[i], values[i]);
            }
            next(null, html, node, context);
        };
        processor.post('render', replace);
    };
};