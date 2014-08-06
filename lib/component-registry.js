var extend = require('node.extend');

function ComponentRegistry() {
    var components = {};

    this.getTags = function() {
        return Object.keys(components);
    };

    this.all = function() {
        var result = [];
        for (var key in components) {
            result.push(components[key]);
        }
        return result;
    };

    this.has = function(tagName) {
        return components.hasOwnProperty(tagName);
    };

    this.get = function(tagName) {
        var component = components[tagName];
        if (!component) {
            throw new Error('Component with tag name "' + tagName + '" not found');
        }
        return component;
    };

    this.register = function(tagName, component) {
        components[tagName] = component;
        return component;
    };

    this.unregister = function(tagName) {
        delete components[tagName];
    };
}

module.exports = ComponentRegistry;

