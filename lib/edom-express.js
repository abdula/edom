var path = require('path'),
    serveStatic = require('serve-static');

exports.connect = function(edom, express) {
    edom.moutedStatic().forEach(function(link) {
        express.use(link.url, serveStatic(link.path));
    });

    var originMountStatic = edom.mountStatic,
        originUnmountStatic = edom.unmountStatic;

    edom.mountStatic = function() {
        var link = originMountStatic.apply(edom, arguments);
        express.use(link.url, express.static(link.path));
    };

    edom.unmountStatic = function( ){
        originUnmountStatic.apply(edom, arguments);
    };

    return {
        disconnect: function() {
            edom.mountStatic = originMountStatic;
        }
    };
};
