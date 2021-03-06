var express = require('express')
  , passport = require('passport')
  , util = require('util')
  , FacebookStrategy = require('passport-facebook').Strategy
  , session = require('express-session')
  , bodyParser = require("body-parser")
  , cookieParser = require("cookie-parser")
  , methodOverride = require('method-override')
  , mongoskin = require('mongoskin');

var logfmt = require("logfmt");
var mongo = require('mongodb');
var path = require('path');

var FACEBOOK_APP_ID = "1396800567290730"
var FACEBOOK_APP_SECRET = "c6a5a80fce3f0856e247661f36a3678e";

var app = express();

// configure Express
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(cookieParser());
  app.use(bodyParser());
  app.use(methodOverride());
  app.use(session({ secret: 'keyboard cat' }));
  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(express.static(__dirname + '/public'));

// MongoDB
var mongoUri = process.env.MONGOLAB_URI ||
  process.env.MONGOHQ_URL ||
  'mongodb://localhost:27017/collectionName';

var db = mongoskin.db(mongoUri, {safe:true});

app.param('collectionName', function(req, res, next, collectionName){
  req.collection = db.collection(collectionName)
  return next()
})


// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Facebook profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

// Use the FacebookStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Facebook
//   profile), and invoke a callback with a user object.
passport.use(new FacebookStrategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: "/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // To keep the example simple, the user's Facebook profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Facebook account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
));

app.get('/', function(req, res){
  res.render('index', { user: req.user });
});

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user });
});

app.get('/feed', function(req, res) {
  res.render('feed.ejs', { user : req.user });
})

app.post('/post', function(req, res){
	//if (not session variable - logged into facebook) -> print out that your session is logged out
	//else -> run below
	var col = db.collection("userPosts")
	var temp = req.body
	temp["TimeOfPost"] = new Date()
	col.insert(req.body, {}, function(e,results){
		if (e){
			res.status(500).send()
		}
		else{
			res.send(results)
		}
	});
});

app.put('/pickedUp', function(req, res) {
  var col = db.collection("userPosts");
  // console.log(req.body.Post_id + "FUCKKKKK YESSSSSSS");
  // col.update({ _id: ObjectId(req.body.Post_id) }, {'$pull':{ PickedUp:"false"}}, function(err) {
  //   if (err) throw err;
  //   col.update({ _id: req.body.Post_id }, {'$push':{ PickedUp:"true" }}, function(err) {
  //       if (err) throw err;
  //       console.log('Updated!');
  //   });
  // });
  console.log("yes");
  col.updateById(req.body.Post_id, { PickedUp: "true" }, function(err) {});

  col.updateById(req.body.Post_id,  { $set: {"PickedUp":'true'}}, function(err) {});
 
  // res.send('success!!');
  
  // col.update({ _id : ObjectId(req.body.Post_id)}, {$set:{PickedUp:"true"}}, function(err, result) {
  //   if (!err) console.log('PickedUp updated!');
  // });
});

app.post('/deliveryInfo', function(req, res){
	var col = db.collection("deliveryInfo")
	col.insert(req.body, {}, function(e, results){
		if (e){
			res.status(500).send()
		}
		else{
			console.log(req.body);
			res.send(req.body);
		}
	});
});

app.get('/getDeliveryInfo', function(req,res){
	var col = db.collection("deliveryInfo")
	col.find().toArray(function(e, results){
		res.send(results);
	});
});

app.get('/newsfeed', function(req,res){
	var col = db.collection("userPosts")
	col.find().toArray(function(e, results){
		res.send(results);
	});
});

// GET /auth/facebook
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Facebook authentication will involve
//   redirecting the user to facebook.com.  After authorization, Facebook will
//   redirect the user back to this application at /auth/facebook/callback
app.get('/auth/facebook',
  passport.authenticate('facebook'),
  function(req, res){
    // The request will be redirected to Facebook for authentication, so this
    // function will not be called.
  });

// GET /auth/facebook/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/facebook/callback', 
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.delete('/delete/post', function(req, res) {
  var collection = db.collection("userPosts")

  collection.removeById(req.body.theid, function(e, result){
    res.send(result)
  })

})

var port = Number(process.env.PORT || 5000);
app.listen(port, function() {});


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}




