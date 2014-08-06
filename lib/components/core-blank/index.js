var Component = require('../../component'),
    _ = require('underscore'),
    renderTag = require('../../util').renderTag;

function arraySearch(filter, arr) {
    for (var i = 0; i < arr.length; i++) {
        var item = arr[i];
        for (var key in filter) {
            if (item.hasOwnProperty(key) &&
                (item[key] === filter[key] || filter[key] === '*')) {
                return i;
            }
        }
    }
    return -1;
}

var template =
    '<!DOCTYPE html>' +
    '<html lang="en">' +
        '<head>\n' +
            '<title>{{title}}</title>\n' +
            '{{#meta}}{{{meta}}}\r{{/meta}}' +
            '{{#links}}{{{links}}}\r{{/links}}' +
            '{{#scripts}}{{{scripts}}}\r{{/scripts}}' +
            '{{#__noWrapStatic__}}{{{__noWrapStatic__}}}\r{{/__noWrapStatic__}}' +
        '</head>\n' +
        '<body {{#__editMode__}}class="edit-mode"{{/__editMode__}}>\n' +
            '<div {{{sAttrs}}}>{{{sChildren}}}</div>' +
        '</body>\n' +
    '</html>';


//var searchPattern = /<body([^>]*)>((.|[\n\r])*)<\/body>/im,
//    replacePattern = '<body$1><div id="{{attrs.id}}" class="wgel {{attrs.class}}" data-type="core-blank" data-cid="{{cid}}">$2</div></body>';

var Page = Component.extend({
    serializeDataSync: function(context) {
        return {
            meta   : this.renderMeta(),
            links  : this.renderLinks(),
            scripts: this.renderScripts()
        };
    },
    finalTemplate: function(opts, tpl) {
        return tpl;
    },
    isBlank: function() {},
    isLeaf: function() {
        return false;
    },
    getLinks: function() {
        return this.get('links');
    },
    setLinks: function(links) {
        this.properties.links = [];
        links.forEach(this.appendLink, this);
        return this;
    },
    insertLink: function(attrs, pos) {},
    removeLink: function(pos) {
        var res = this.properties.links[pos];
        if (res) {
            this.properties.links.splice(pos, 1);
        }
        return res;
    },
    appendLink: function(attrs) {
        if (typeof attrs === 'string') {
            attrs = {href: attrs};
        }
        attrs = _.extend({type: 'text/css', media: 'all', rel: 'stylesheet'}, attrs);
        this.properties.links.push(attrs);
        return this;
    },
    appendLinks: function(links) {
        var self = this;
        links.forEach(function(link) {
            self.appendLink(link);
        });
        return this;
    },
    renderLinks: function() {
        var result = '';
        this.getLinks().forEach(function(item){
            if (!item.type) {
                item.type = 'text/css';
            }
            item.rel="stylesheet";

            result += renderTag('link', item, '') + '\r';
        });
        return result;
    },
    renderScripts: function() {
        var result = '';
        this.getScripts().forEach(function(item){
            result += renderTag('script', item, '') + '\r';
        });
        return result;
    },
    appendScript: function(attrs) {
        if (typeof attrs === 'string') {
            attrs = {src: attrs};
        }
        attrs = _.extend({type: 'text/javascript'}, attrs);
        this.properties.scripts.push(attrs);
        return this;
    },
    appendScripts: function(scripts) {
        var self = this;
        scripts.forEach(function(script) {
            self.appendScript(script);
        });
        return this;
    },
    insertScript: function(attrs, pos) {},
    setScripts: function(scripts) {
        this.properties.scripts = [];
        scripts.forEach(this.appendScript, this);
        return this;
    },
    getScripts: function() {
        return this.get('scripts');
    },
    removeScript: function(index) {
        var res = this.properties.scripts[index];
        this.properties.scripts.splice(index, 1);
        return res;
    },
    setKeywords: function(keywords) {
        return this.setMeta({name: 'keywords', content: keywords});
    },
    setDescription: function(description) {
        return this.setMeta({name: 'description', content: description});
    },
    setTitle: function(title) {
        this.set('title', title);
        return this;
    },
    setCharset: function(charset) {
        return this.setMeta({'charset': charset});
    },
    renderMeta: function() {
        var meta = this.getMeta();
        return meta.map(function(data) {
            return renderTag('meta', data);
        }).join('\r');
    },
    //doctype: function() {},
    setMeta: function(data) {
        if (!Array.isArray(data)) {
            data = [data];
        }
        var meta = this.properties.meta || {};
        for (var i = 0; i < data.length; i++) {
            var item = data[i],
                pos = -1;
            switch(true) {
                case item.hasOwnProperty('name'):
                    pos = arraySearch({name: item.name}, meta);
                    break;
                case item.hasOwnProperty('charset'):
                    pos = arraySearch({charset: '*'}, meta);
                    break;
                case item.hasOwnProperty('http-equiv'):
                    pos = arraySearch({'http-equiv': item['http-equiv']}, meta);
                    break;
            }
            if (pos !== -1) {
                meta.splice(pos, 1);
            }
            meta.push(item);
        }
        this.properties.meta = meta;
    },
    getMeta: function() {
        return this.get('meta');
    },
    template: template,
    getDefaults: function() {
        return {
            meta: [
                {charset: 'utf-8'},
                {name: "viewport", content: "width=device-width, initial-scale=1.0"}
            ]
        };
    }
}, {tagName: 'core-blank'});

exports.getComponent = function() {
    return Page;
};
