var FormElement = require('../core-form/element');

var FormInput = FormElement.extend({
    getType: function() {
        return this.attrs('type');
    },
    setType: function(type) {
        this.attrs('type', type);
        return this;
    },
    template: '<input {{{sAttrs}}}>',
    getDefaults: function() {
        return {attributes: {type: 'text'}};
    }
}, {
    tagName: 'core-input'
});

exports.getComponent = function() {
    return FormInput;
};
