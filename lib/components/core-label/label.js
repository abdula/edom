var Component = require('../../component'),
    _ = require('underscore');

var Label = Component.extend({
    initialize: function() {},
    serializeDataSync: function() {
        return {
            label:this.getText()
        };
    },
    setText: function(text) {
        return this.set('text', text);
    },
    getText: function() {
        return this.get('text');
    },
    serializeAttrs: function() {
        var attrs = Label.__super__.serializeAttrs.apply(this, arguments),
            forAttr = this.attrs('for');

        attrs.for = forAttr? this.root().find(forAttr).attrs('id'): '';
        return attrs;
    },
    template: '<label {{{sAttrs}}}>{{label}}</label>',
    getDefaults: function() {
        return {
            text: 'Label',
            attributes: {
                "for": ''
            }
        };
    }
}, {
    tagName: 'core-label'
});

module.exports.getComponent = function() {
    return Label;
};
