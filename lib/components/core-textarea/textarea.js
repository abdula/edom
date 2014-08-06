var FormElement = require('../core-form/element');

var Textarea = FormElement.extend({
    initialize: function(options) {
        Textarea.__super__.initialize.call(this, options);
    },
    template: '<textarea {{{sAttrs}}}">{{{value}}}</textarea>'
}, {
    tagName: 'core-textarea'
});

exports.getComponent = function(edom) {
    return Textarea;
};
