var validator = require('../index')(),
    should = require('should');

describe('Validator', function() {

    it('should throw exception when schema is invalid', function() {
        (function() {
            validator.validator("test");
        }).should.throw();

        (function() {
            validator.validator([
                {name: 'test1'}
            ]);
        }).should.throw();
    });

    it('should validate', function() {
        var validate = validator.validator([
            {name: 'isEmail', message: '{{value}} Invalid email'}
        ]);
        validate.should.have.property('validate').and.type('function');

        validate.validate('test').should.be.eql(['test Invalid email']);
        validate.validate('test').should.be.eql(['test Invalid email']);

        validate.validate('john@gmail.com').should.be.true;

        validate = validator.validator([
            {
                name: 'matches',
                options: {
                    pattern: 'abc',
                    modifiers: 'gi'
                },
                message: 'Invalid'
            }
        ]);
        validate.validate('dsfdf Abc dsf').should.be.true;
        validate.validate('test').should.be.eql(['Invalid']);
    });

    it('should sanitize', function() {
        var sanitizer = validator.sanitizer([
            {name: 'ltrim', options: {chars: '_'}}
        ]);
        sanitizer.should.have.property('sanitize').and.type('function');
        sanitizer.sanitize('___test').should.be.eql('test');
    });
});



