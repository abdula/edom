var Component = require('../../component'),
    _ = require('underscore');

var Link = Component.extend({
    getHref: function() {
        return this.attrs('href');
    },
    setHref: function(href) {
        this.attrs('href', href);
        return this;
    },
    template: '<a {{{sAttrs}}}>{{caption}}</a>',
    getDefaults: function() {
        return {
            text: '',
            attributes: {
                href: '#'
            }
        };
    }
}, {
    tagName: 'core-link'
});

module.exports.getComponent = function() {
    return Link;
};
