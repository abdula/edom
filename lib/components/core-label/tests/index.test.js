/*global describe, it, before */

var EDom = require('../../../edom'),
    assert = require('assert');

describe('EDom', function() {
    var edom;

    before(function(done) {
        edom = new EDom({});
        edom.on('ready', done);
    });

    it('should render label', function (cb) {
        var doc = edom.document({
            children: [{
                tagName: 'core-label',
                label: 'Label',
                attributes: {for: 'input'}
            }, {
                tagName: 'core-input',
                cid: 'input',
                attributes: {id: 'inputID'}
            }]
        });

        doc.render({}, function(err, html) {
            if (err) return cb(err);
            try {
                assert.ok(/\<label.+for=\"inputID\"/.test(html));
            } catch(e) {
                return cb(e);
            }
            return cb();
        });
    });
});
