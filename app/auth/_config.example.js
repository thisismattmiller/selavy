

/*
  This is an example of what the _config.js file should look like
*/

var ids = {
  github: {
    clientID: 'get_your_own',
    clientSecret: 'get_your_own',
    callbackURL: "http://127.0.0.1:3000/auth/github/callback"
  }
  twitter: {
    consumerKey: 'get_your_own',
    consumerSecret: 'get_your_own',
    callbackURL: "http://127.0.0.1:3000/auth/twitter/callback"
  }
};

module.exports = ids;