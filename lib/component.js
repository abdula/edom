var AbstractComponent = require('./abstract-component'),
    Document = require('./document'),
    path = require('path'),
    _ = require('underscore');

var Component = AbstractComponent.extend({
    getCommands: function() {
        return this.get('commands');
    },
    setCommands: function(commands) {
        return this.set('commands', commands);
    },
    getDocument: function() {
        var node = this, parent;
        while(parent = node.parent()) {
            node = parent;
        }
        if (node instanceof Document) {
            return node;
        }
        return false;
    },
    processNode: function(context, next) {
        this.executeCommands(context, next);
    },
    executeCommands: function(context, next) {
        var cmds = this.getCommands();
        if (!cmds.length) {
            return next();
        }
        return this.edom.getCommandDispatcher().dispatch(cmds, _.extend({element: this}, context), next);
    },
    staticUrl: function(filePath) {
        return this.edom.staticUrl(filePath);
    },
    localStaticUrl: function(filePath) {
        return this.edom.staticUrl(path.join('components', this.tagName, filePath));
    }
});

Component.tagName = 'component';

module.exports = Component;
