var fs = require('fs.extra'),
    path = require('path');

/**
 * local fs assets manager
 *
 * @constructor
 */
function LocalStaticManager(options, edom) {
    if (!options.root) {
        throw new Error('Mount dir is not specified');
    }
    var root = path.resolve(options.root),
        baseUrl = options.baseUrl || '/edom/assets';

    this.root = function() {
        return root;
    };

    this.mount = function(url, dir, cb) {
        var link = {
            src: path.resolve(dir),
            dest: path.join(root, path.normalize(url)),
            url: this.url(url),
            relativeUrl: url
        };

        var dirname = path.dirname(link.dest);

        var done = function(err) {
            if (!cb) {
                return err;
            }
            if (err) {
                return cb(err);
            }
            return cb(null, link);
        };

        fs.lstat(link.dest, function(err, stat) {
            if (stat && stat.isSymbolicLink()) {
                done(null);
            } else {
                fs.exists(dirname, function(exists) {
                    if (!exists) {
                        fs.mkdirRecursive(dirname, function(err) {
                            if (err) {
                                return cb(err);
                            }
                            return fs.symlink(link.src, link.dest, done);
                        });
                    } else {
                        fs.symlink(link.src, link.dest, done);
                    }
                });
            }
        });

        return link;
    };

    this.url = function(url) {
        if (!url) {
            return baseUrl;
        }
        return path.join(baseUrl, path.normalize(url));
    };

    this.unmount = function(url, cb) {
        fs.unlink(path.join(root, path.normalize(url)), cb);
    };

    this.isMountedDir = function(dir) {};

    this.isMounted = function(url) {};

    this.list = function() {
        throw new Error('not implemented');
    };
}

module.exports = LocalStaticManager;