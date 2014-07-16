(function(cordova) {
  function Feedback() {};
  
  Feedback.prototype.showFeedbackPanel = function() {
    cordova.exec(null, null, "Feedback", "showFeedbackPanel", []);
  }

  cordova.addConstructor(function() {
    if(!window.plugins) window.plugins = {};
    window.plugins.Feedback = new Feedback();
  });

})(window.cordova || window.Cordova);
