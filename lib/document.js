var clone  = require('underscore').clone,
    util   = require('util'),
    assert = require('assert'),
    _      = require('lodash'),
    extend = require('node.extend'),
    events = require('events'),
    AbstractComponent = require('./abstract-component'),
    Component = require('./component');

function Document(properties, options) {
    properties || (properties =  {});
    options || (options =  {});

    //console.log(util.inspect(properties, { showHidden: true, depth: null, colors: true }));

    if (!properties.cid) {
        properties.cid = 'root';
    }

    var obj = clone(properties);

    var tpl = obj.tpl;
    delete obj.tpl;

    AbstractComponent.call(this, obj, options);

    if (tpl) {
        return this.useLayout(tpl);
    }
}

Document.tagName = 'document';

util.inherits(Document, AbstractComponent);

Document.prototype.createNode = function() {
    return this.edom.createComponent.apply(this.edom, arguments);
};

Document.prototype.renderChildren = function(children) {
    return children;
};

Document.prototype.template = '{{{sChildren}}}';

Document.prototype.setParent = function(parent) {
    if (parent) {
        throw 'Document can\'t have parent node';
    }
};

/**
 * cloning of the document
 *
 * @todo it does not clone options of nodes
 *
 * @returns {Document}
 */
Document.prototype.clone = function() {
    return this.edom.document(this.toObject(true), this.getOptions());
};

Document.prototype.hasLayout = function( ){
    return this.tpl instanceof Document;
};

Document.prototype.getLayout = function() {
    return this.tpl;
};

var arrDiff = function(arr, arr1) {
    return arr.filter(function(item) {
        return arr1.some(function(item1) {
            try {
                assert.deepEqual(item, item1);
            } catch (e) {
                return true;
            }
            return false;
        });
    });
};

Document.prototype.withoutLayout = function() {
    if (!this.hasLayout()) {
        return this;
    }

    var newDoc = extend(true, {}, this.getProperties());
    var oldRoot = this.getFirstChild(),
        tplRoot = this.tpl.getFirstChild(),
        newRoot = oldRoot.toObject(false);

    newRoot.scripts  = arrDiff(oldRoot.getScripts(), tplRoot.getScripts());
    newRoot.links    = arrDiff(oldRoot.getLinks(), tplRoot.getLinks());
    newRoot.children = this.__blocks__.map(function(block) {
        return block.toObject(true);
    });
    newDoc.children = [newRoot];
    delete newDoc.tpl;
    return this.edom.document(newDoc);
};

Document.prototype.copy = function(deep) {
    return this.edom.document(this.toObject(deep), this.getOptions());
};

Document.prototype.isLeaf = function() {
    return false;
};

/**
 * apply layout to the document
 * notice: return a new document
 *
 * @param {Document} tpl
 * @returns {Document}
 */
Document.prototype.useLayout = function(tpl) {
    if (!tpl) {
        return this.withoutLayout();
    }

    if (_.isPlainObject(tpl)) {
        tpl = this.edom.document(tpl);
    }

    if (false === (tpl instanceof Document)) {
        throw new Error('The layout must be an instance of Document');
    }

    var doc = this,
        blocks = [],
        root = this.getFirstChild(),
        newDoc = tpl.clone(true);

    var properties = newDoc.getProperties();
    delete properties.links;
    delete properties.scripts;

    newDoc.setProperties(extend({}, tpl.getProperties(), newDoc.getProperties()));
    newDoc.setId(this.getId());
    newDoc.getFirstChild()
          .appendLinks(root.getLinks())
          .appendScripts(root.getScripts());

    newDoc.set('tpl', tpl.getId());

    newDoc.tpl = tpl;
//    Object.defineProperty(newDoc, 'tpl', {
//        enumerable: false,
//        value: tpl,
//        writable: false,
//        configurable: false
//    });

    newDoc.forEach(function(item) {
        item.__tpl__ = true;
        if (!item.isBlock) {
            item.setReadOnly(true);
        } else {
            blocks.push(item);
        }
    }, this);

    newDoc.__blocks__ = blocks;

    blocks.forEach(function(block) {
        var docBloc = doc.getDescendant(block.getCid()); //should be use name of block
        if (docBloc) {
            block.removeChildren();
            block.addChildren(docBloc.getChildren().map(function(child) {
                return child.cloneNode(true);
            }));
        }
    });

    return newDoc;
};

Document.prototype.finalTemplate = function() {
    return this.get('template');
};

Document.createBlank = function(options) {
    return new Document({
        children: [{
            tagName: 'core-blank'
        }]
    }, options);
};

module.exports = Document;