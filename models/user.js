const config = require('config');
const db = require('../db.js');
const fs = require('fs')

let database_folder = config.get('database_folder');

if (database_folder.substr(0, database_folder -1) !== '/') {
    database_folder += '/';
}

module.exports = {
    
    // Replace weird characters
    sanitizeUsername: function(user) {
        return user.replace(/[\W_]+/g, '').toLowerCase();
    },

    // Get the username from the cookie
    getUsername: function(req) {
        if (req.cookies)
            return req.cookies['username'];

        return '';
    },

    // Inject local variables. Used for displaying the menu and stuff.
    injectLocalVariables: function(req, res) {
        let username = this.getUsername(req);
        
        res.locals.loggedIn = (username ? true : false);
        res.locals.username = username;
    },

    // Check if the user is registered
    checkLogin: function(user)  {
        user = this.sanitizeUsername(user);

        let database_path = database_folder + user + '.db';

        try {
            if (fs.existsSync(database_path)) {
                db.connect(user);

                return true;
            }
        } catch(error) {
            console.error(error);
        }

        return false;
    }

}

