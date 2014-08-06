var _ = require('underscore');
var fs = require('fs');

_.str = require('underscore.string');

exports.extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
        child = protoProps.constructor;
    } else {
        child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate();

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) {
        _.extend(child.prototype, protoProps);
    }

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
};

exports.walkSync = function walkSync(dir) {
    var results = [];
    var list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        var stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkSync(file));
        } else {
            results.push(file);
        }
    });
    return results;
};


exports.merge = require('node.extend');

exports.clone = _.clone;

exports.classify = function(string) {
    return _.str.classify(string);
};

exports.camelize = function(string) {
    return _.str.camelize(string);
};

function stringifyAttrs(attrs, opts) {
    var result = [],
        val;
    for (var key in attrs) {
        if (attrs.hasOwnProperty(key)) {
            val = String(attrs[key]);
            if (val.length) {
                result.push(key + '="' + _.escape(val) + '"' );
            }
        }
    }
    return result.join(' ');
}

exports.stringifyAttrs = stringifyAttrs;

exports.renderTag = function(tag, attrs, content) {
    var str = '<' + tag + ' ' + stringifyAttrs(attrs);
    switch (tag) {
        case 'link':
            str += ' rel="stylesheet"/>\n';
            break;
        case 'meta':
            str += '/>\n';
            break;
        default:
            str += '>' + (content || '') + '</' + tag +'>\n';
    }
    return str;
};
