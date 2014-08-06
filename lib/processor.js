var hooks = require('hooks'),
    async = require('async'),
    _     = require('underscore'),
    Mustache = require('mustache');

function returnCid(n) {
    return n.getCid();
}

module.exports = (function() {
    var viewEngine = Mustache,
        cache =  null;

    function renderDoc(node, context, cb) {
        var list = node.selfAndDescendants(),
            hashObj = {},
            cid = node.getCid(),
            self = this,
            inCache = {},
            toCache = {};

        context = _.extend({viewEngine: viewEngine}, context);

        function buildHtml(id) {
            var item = hashObj[id],
                html = item[0],
                children = item[1],
                childId;

            for (var i = 0, l = children.length; i < l; i++) {
                childId = children[i];
                html = html.replace('__' + childId + '__', buildHtml(childId));
            }
            return html;
        }

        function render(cb) {
            async.forEach(list, function(node, next) {
                var cid = node.getCid();
                if (inCache.hasOwnProperty(cid)) {
                    hashObj[cid] = [inCache[cid], node.getChildNodes().map(returnCid)];
                    return next();
                }
                return self.renderNode(node, context, function(err, html) {
                    if (err) {
                        return next(err);
                    }

                    hashObj[cid] = [html, node.getChildNodes().map(returnCid)];
                    //cacheOpts = node.formCacheOpts(context);
                    toCache[cid] = html;
                    next();
                });
            }, function(err) {
                if (err) {
                    return cb(err);
                }
                cb(null, buildHtml(cid), context);
            });
        }

        if (cache) {
            cache.get(list.map(returnCid), function(err, result) {
                if (err) {
                    return cb(err);
                }
                inCache = result;
                render(function(err, html) {
                    if (err) {
                        return cb(err);
                    }

                    cache.mset(toCache, function() {});

                    return cb(null, html, node, context);
                });
            });
        } else {
            render(function(err, html) {
                if (err) {
                    return cb(err);
                }
                return cb(null, html, node, context);
            });
        }
    }

    function renderNode(node, context, next) {
        node.renderNode(context, function(err, html) {
            if (err) {
                return next(err);
            }
            return next(null, html, node, context);
        });
    }

    function processNode(node, context, next) {
        node.processNode(context, function(err) {
            if (err) {
                return next(err);
            }
            return next(null, node, context);
        });
    }

    var responseLogger = (function() {
        function hasCalled(fn) {
            if (fn) {
                return this.logFn.indexOf(fn) !== -1;
            }
            return this.logFn.length > 0;
        }

        var logFn = ['send', 'sendFile'],
            l = logFn.length;

        return {
            use: function(res) {
                res.logFn = [];
                res.hasCalled = hasCalled;
                logFn.forEach(function(fn) {
                    var origin = res[fn];
                    res[fn] = function() {
                        res.logFn.push(fn);
                        return origin.apply(res, arguments);
                    };
                });
                return res;
            }
        };
    }());

    function process(node, context, cb) {
        var res = context.res,
            list = node.selfAndDescendants(),
            self = this;

        responseLogger.use(res);

        async.forEach(list, function(n, next) {
            self.processNode(n, _.extend({}, context), next);
        }, function(err) {
            if (!cb) {
                cb = function() {};
            }

            if (err) {
                return cb(err);
            }

            if (res.logFn.length > 0) {
                return cb(null, node, context);
            }

            return res.format({
                html: function() {
                    node.render(context, function(err, html) {
                        if (err) {
                            cb(err);
                        } else {
                            res.send(html);
                            cb(null, node, context);
                        }
                    });
                },
                json: function() {
                    res.json(node.toObject(!(context.hasOwnProperty('ignoreChildren')? context.ignoreChildren:false)));
                }
            });
        });
    }

    var obj = {
        use: function(middleware) {
            if (typeof middleware === 'function') {
                return middleware(this);
            }
            var pluginPath = arguments[0];

            if (pluginPath.indexOf('/') === -1) {
                pluginPath = './plugins/'  + pluginPath;
            }

            var plugin = require(pluginPath);
            return plugin.apply(this, Array.prototype.slice.call(arguments, 1))(this);
        },
        getCache: function() {
            return cache;
        },
        setViewEngine: function(engine) {
            viewEngine = engine;
        },
        getViewEngine: function() {
            return viewEngine;
        },
        clearCache: function(node, cb) {
            if (!cache) {
                return cb(null);
            }
            var ids = node.selfAndDescendants().map(returnCid);
            return cache.del(ids, cb);
        },
        setCache: function(obj) {
            cache = obj;
        },
        renderNode:  renderNode,
        render:      renderDoc,
        processNode: processNode,
        process:     process
    };

    for (var k in hooks) {
        if (hooks.hasOwnProperty(k)) {
            obj[k] = hooks[k];
        }
    }

    obj.hook('process', obj.process);
    obj.hook('processNode', obj.processNode);
    obj.hook('render', obj.render);
    obj.hook('renderNode', obj.renderNode);

    return obj;
}());

