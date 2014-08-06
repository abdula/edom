var Component = require('../../component'),
    _ = require('underscore');

var Button = Component.extend({
    getType: function() {
        return this.attrs('type');
    },
    setType: function(type) {
        this.attrs('type', type);
        return this;
    },
    setCaption: function(caption) {
        return this.set('caption', caption);
    },
    getCaption: function() {
        return this.get('caption');
    },
    serializeDataSync: function() {
        return {
            caption: this.get('caption')
        };
    },
    template: '<button {{{sAttrs}}}>{{caption}}</button>',
    getDefaults: function() {
        return {
            caption: 'Save',
            attributes: {
                type: 'button'
            }
        };
    }
}, {
    tagName: 'core-button'
});

module.exports.getComponent = function() {
    return Button;
};
