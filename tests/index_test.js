/*global describe, it, before, beforeEach, after, afterEach */

var EDom = require('../lib/edom'),
    should = require('should'),
    fs = require('fs.extra'),
    async = require('async');

describe('EDom', function() {
    var defOpts = {},
        context = {editMode: true, res: {'format': function() {}}, req:{}};

    it('should create new instance', function() {
        should.ok(typeof EDom === 'function');
        var edom =  new EDom(defOpts);
        edom.should.be.an.instanceOf(EDom);
    });

    it('should emit ready', function(done) {
        var edom = new EDom(defOpts);
        edom.on('error', function(error) {
            done(error);
        });
        edom.on('ready', function() {
            done();
        });
    });

    it('should load core components', function(done) {
        var edom = new EDom(defOpts);
        edom.components.should.be.an.Object;

        edom.on('ready', function() {
            edom.components.get('core-form').should.be.type('function');
            done();
        });
    });

    it('should create components', function(done) {
        var edom = new EDom(defOpts);
        edom.on('ready', function() {
            var blank = edom.createComponent({
                tagName: 'core-blank'
            });
            blank.should.be.an.Object;

            var form = edom.createComponent({
                tagName: 'core-form'
            });

            form.should.be.an.Object;
            done();
        });
    });

    it('should render components', function(done) {
        var edom = new EDom(defOpts);
        edom.on('ready', function() {
            var blank = edom.blank();
            blank.should.be.an.Object;

            blank.render(context, function(err, html) {
                if (err) {
                    done(err);
                } else {
                    html.indexOf('core-blank').should.be.not.eql(-1);
                    done();
                }
            });
        });
    });

    it('should create documents', function(done) {
        var edom = new EDom(defOpts);
        edom.on('ready', function() {
            var doc = edom.document({
                children: [{
                    tagName: 'core-blank'
                }]
            });
            doc.should.be.an.Object;
            doc.getFirstChild().should.be.an.Object;
            doc.edom.should.be.an.instanceOf(EDom);
            done();
        });
    });

    it('should mount/unmount static', function(done) {
        var mountPath = __dirname + '/.tmp';
        var edom = new EDom({
            "static": {
                root: mountPath,
                baseUrl: '/edom/assets'
            }
        });

        async.series([
            function(next) {
                edom.mountStatic('/components/x-form', __dirname + '/fixtures/x-form', function(err) {
                    if (err) {
                        next(err); return;
                    }
                    fs.lstat(mountPath + '/components/x-form', function(err, stat) {
                        if (err) {
                            return next(err);
                        }
                        should.ok(stat.isSymbolicLink());
                        next();
                    });
                });
            },
            function(next) {
                edom.unmountStatic('/components/x-form', function(err) {
                    if (err) {
                        return next(err);
                    }
                    fs.exists(mountPath + '/components/x-form', function(exists) {
                        exists.should.not.be.ok;
                        next();
                    });
                });
            }
        ], function(err) {
            fs.rmrf(mountPath, function() {
                done(err);
            });
        });
    });

    it('should render block component', function(done) {
        var edom = new EDom(defOpts);
        edom.on('ready', function() {
            var doc = edom.document({
                children: [{
                    tagName: 'core-blank',
                    children: [{
                        tagName: 'core-block'
                    }]
                }]
            });
            doc.render(context, function(err, html){
                if (err) return done(err);
                html.indexOf('core-block').should.be.not.equal(-1);
                done();
            });
        });
        edom.on('error', done);
    });

    describe('Ready edom', function() {
        var edom;
        before(function(done) {
            edom = new EDom(defOpts);
            edom.on('ready', done);
            edom.on('error', done);
        });

        describe('Component', function( ){
            it('should return changed properties', function() {
                var doc = edom.document({
                    cid: "root",
                    children: [{
                        cid: 'blank',
                        tagName: 'core-blank'
                    }]
                });
                doc.getDiff().should.containDeep({
                    tagName: 'document',
                    cid: "root",
                    children: [{
                        cid: 'blank',
                        tagName: 'core-blank'
                    }]
                });
            });

            it('should return id in object', function() {
                edom.createComponent({
                    tagName: 'core-input',
                    _id: '123'
                }).getDiff()._id.should.be.eql('123');
            });
        });

        describe('Document', function() {
            it('should extend layout', function() {
                var layout = edom.document({
                    cid: "root",
                    children: [{
                        cid: 'blank',
                        tagName: 'core-blank',
                        children: [{
                            cid: 'block',
                            tagName: 'core-block'
                        }]
                    }]
                });

                var doc = edom.blank({});
                doc = doc.useLayout(layout);
                doc.find('blank').should.be.an.Object;

                doc.find('block').addChild({tagName: 'core-input', _id: 1000, cid: 'input'});
                var input = doc.find('input');
                input.should.be.an.Object;
                input.getDiff()._id.should.be.eql(1000);
            });
        });
    })
});

