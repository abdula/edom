var Component= require('../../component');

var Block = Component.extend({
    template: '<div {{{sAttrs}}}>{{{sChildren}}}</div>',
    isBlock: true,
    isLeaf: function() {
        return false;
    }
}, {
    tagName: 'core-block'
});

exports.getComponent = function(edom) {
    return Block;
};

