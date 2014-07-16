(function (cordova) {
    function SocialSharing() {};

    SocialSharing.prototype.setupAccount = function(userID, userName, token, expire) {
        cordova.exec(null, null, "SocialSharing", "setupAccount", [userID, userName, token, expire]);
    };

    SocialSharing.prototype.getShareAuthInfo = function(callback) {
        cordova.exec(callback, null, "SocialSharing", "getShareAuthInfo", []);
    };

    SocialSharing.prototype.shareArtist = function(artistID, artistName, artistURL, coverURL, failCallback) {
        cordova.exec(null, failCallback, "SocialSharing", "shareArtist", [
            artistID, artistName, artistURL, coverURL
        ]);
    };

    SocialSharing.prototype.shareSong = function(songID, songTitle, songURL, artistID, artistName, coverURL, failCallback) {
        cordova.exec(null, failCallback, "SocialSharing", "shareSong", [
            songID, songTitle, songURL, artistID, artistName, coverURL
        ]);
    };

    SocialSharing.prototype.logoutDoubanAccount = function() {
        cordova.exec(null, null, 'SocialSharing', 'logoutDoubanAccount', []);
    };

    SocialSharing.prototype.authorizeByVendor = function(vendorType, callback) {
        cordova.exec(callback, null, 'SocialSharing', 'authorizeByVender', [vendorType]);
    };

    SocialSharing.prototype.deAuthorizeByVendor = function(vendorType, callback) {
        cordova.exec(callback, null, 'SocialSharing', 'deAuthorizeByVender', [vendorType]);
    }


    cordova.addConstructor(function() {
        if(!window.plugins) window.plugins = {};
        window.plugins.SocialSharing = new SocialSharing();
    });
})(window.cordova || window.Cordova || PhoneGap);
