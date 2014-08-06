var Component = require('../../component'),
    Text = Component.extend({
        template: '<div {{{sAttrs}}}>{{{content}}}</div>',
        getDefaults: function () {
            return {
                attributes: {
                    placeholder: ''
                },
                content: ''
            };
        }
    }, {
        tagName: 'core-text'
    });

exports.getComponent = function() {
    return Text;
};