var Component= require('../../component'),
    async = require('async');

function createPages(activePage, limit, totalItems) {
    var numberOfPages = Math.ceil(totalItems / limit),
        pages = [];

    if (numberOfPages < 2) return pages;

    var scrollBack = {
        url: '?limit=' + limit + '&page=' + (parseInt(activePage) - 1),
        title: '«',
        active: activePage <= 1
    };
    pages.push(scrollBack);
    for (var i = 0; i < numberOfPages; i++) {
        var curr = i + 1;
        var page = {
            url: '?limit=' + limit + '&page=' + curr,
            title: curr,
            active: activePage === curr
        };
        pages.push(page);
    }
    var scrollForward = {
        url: '?limit=' + limit + '&page=' + (parseInt(activePage) + 1),
        title: '»',
        active: activePage >= numberOfPages
    };
    pages.push(scrollForward);
    return pages;
}

var List = Component.extend({
    parse: function(data) {
        if (typeof data.datasource === 'string') {
            data.datasource = this.edom.dataSources.get(data.datasource);
        }
        return data;
    },
    initialize: function (options) {
        if (!options.datasource) {
            throw 'Data source not specified';
        } else {
            this.datasource = options.datasource;
        }
    },
    serializeData: function (context, cb) {
        var self = this,
            req = context.req;

        if (Array.isArray(this.datasource)) {
            var activePage = (req.query && req.query.page) || 1,
                limit = (req.query && req.query.limit) || 10,
                totalItems = this.datasource.length,
                skip = (activePage - 1) * limit,
                data = this.datasource.slice(skip, skip + limit),
                pages = createPages(activePage, limit, totalItems);
            cb(null, {data: data, pages: pages});
            return;
        }

        async.parallel({
            data: function(next) {
                self.datasource.fetch(req, next);
            },
            count: function(next) {
                self.datasource.count(next);
            }
        }, function(err, rslt) {
            if (err) {
                cb(err);
            } else {
                var activePage = req.query.page || 1,
                    limit = req.query.limit || 10,
                    totalItems = rslt.count,
                    data = rslt.data,
                    pages = createPages(activePage, limit, totalItems);
                cb(null, {data: data, pages: pages});
            }
        });
    },
    toObject: function () {
        var json = List.__super__.toObject.apply(this, arguments);
        if (Array.isArray(this.datasource)) {
            json.datasource = this.datasource;
        } else {
            json.datasource = this.datasource.id;
        }
        return json;
    }
}, {tagName: 'core-list'});

exports.getComponent = function() {
    return List;
};

//var list = new List({
//    datasource: 'pages',
//    headerTemplate: '<ul>',
//    itemTemplate: '<li></li>',
//    footerTemplate: '</li>',
//    perPage: ''
//});

