var fs = require('fs');

exports.parseJSONFile = function(filePath, cb) {
    fs.readFile(filePath, function(err, data) {
        var result;
        if (err) return cb(err);

        try {
            result = JSON.parse(data);
        } catch (e) {
            return cb(e);
        }
        return cb(null, result);
    });
}
