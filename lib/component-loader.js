var util = require('util')
    fs = require('fs'),
    path = require('path'),
    async = require('async'),
    parseJSONFile = require('./libs/json-parser').parseJSONFile,
    EventEmitter = require('events').EventEmitter;

function getSubDirs(dir, cb) {
    fs.readdir(dir, function(err, list) {
        if (err) return cb(err);

        list = list.map(function(folder) {
            return path.join(dir, folder);
        });

        return async.filter(list, function(d, next) {
            fs.stat(d, function(err, stat) {
                if (err) return next(err);

                return next(stat.isDirectory());
            });
        }, cb);
    });
}

function ComponentLoader(edom) {
    EventEmitter.call(this);

    var rootPath = 'components',
        registry = edom.components;

    this.loadPackage = function(dir, cb) {
        var self = this;
        getSubDirs(dir, function(dirs) {
            async.map(dirs, function(dir, next) {
                self.loadComponent(dir, next);
            }, cb);
        });
    };

    this.destroyComponent = function(name, cb) {
        var component = registry.get(name);
        if (!component) {
            cb(null, false);
            return;
        }
        var pkg = component._pkg;
        registry.unregister(name);
        edom.unmount(path.join(rootPath, pkg.tagName), function(err) {
            if (err) return cb(err);
            return cb(null, component);
        });
    };

    this.loadComponent = function(dir, cb) {
        parseJSONFile(path.join(dir, 'package.json'), function(err, pkg) {
            if (err) return cb(err);

            var main = pkg.main || './index.js',
                component = require(path.resolve(dir, main)).getComponent(edom);

            if (!component) {
                return cb(new Error('method getComponent should return constructor function'));
            }

            component._pkg = pkg;
            registry.register(component.tagName, component);

            var assetsPath = pkg.staticAssets;
            if (!assetsPath) {
                return cb(null, pkg);
            }

            var srcPath  = path.resolve(path.join(dir), assetsPath),
                destPath = path.join(rootPath, pkg.tagName);

            edom.mountStatic(destPath, srcPath, function(err, res) {
                if (err) {
                    return cb(err);
                }
                return cb(null, component);
            });
        });
    };
}

util.inherits(ComponentLoader, EventEmitter);

module.exports = ComponentLoader;
