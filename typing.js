Texts = new Meteor.Collection('texts');

if (Meteor.isClient) {

  Meteor.startup(function(){
    Session.set('isReady',false)
    isReady(Texts);
  });

  Meteor.subscribe('texts',function(){
    Session.set('isReady',true)
    // observe Texts change from others
    Texts.find({user:{$ne:Session.get('user_id')}}).observe({
        added: function (){
          document.getElementById('t').value  = Texts.findOne({},{sort:{time:-1}}).content; // need $ne:lastmodified?
        }
    });
  });

  var isReady = function(db){
    var isready = (db.find({last_modified:{$gt:(new Date()).getTime() - 24*1000}}).count() !== 0);
    Meteor.call('touchDB', function(error, result) {
      if (error !== undefined) console.log(error);
    });
    Session.set('isReady',isready)
    return isready;
  }

  Template.editor.isLoading = function(){ return !Session.get('isReady');};
  Template.editor.events({
    'keyup textarea#t' : function updateText() {
      if (isReady(Texts)){
        var tmp = Texts.insert({user:Session.get('user_id'),content:document.getElementById('t').value,time:(new Date).getTime()});
        if (Session.get('user_id')==undefined) Session.set('user_id',tmp);
      }else{
        console.log('is not ready for input');
        setTimeout(updateText,500);
      }
    }
  });
}

if (Meteor.isServer) {

  var touchDB = function(db){
    if (!db.find({last_modified:{$exists:true}}).count()){
      db.insert({last_modified:(new Date()).getTime()});
    }else{
      var marker = db.find({last_modified:{$exists:true}}).fetch()[0]._id;
      db.update({_id:marker},{$set:{last_modified:(new Date()).getTime()}});
    }
  };

  Meteor.publish('texts',function(){
    return Texts.find();
  });
  Meteor.methods( {
    touchDB: function() { touchDB(Texts);}
  });
  Meteor.setInterval(function(){
    // save only newer 10 (+ timestamp)
    while(Texts.find({time:{$exists:true}}).count() > 10){
      var last_id = Texts.findOne({time:{$exists:true}},{sort:{time:1},sort:{last_modified:-1}})._id;
      Texts.remove({_id:last_id});
    };
  },10*1000);
}
