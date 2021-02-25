
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose'); 
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
// const encrypt = require('mongoose-encryption');
// const md5 = require('md5');

const app = express();
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
	email: String,
	password: String,
	facebookId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/authenticate/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
  	console.log(profile);
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/",function(req, res){
	res.render("home");
});

app.get('/authenticate/facebook',
  passport.authenticate('facebook'));

app.get('/authenticate/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/login",function(req, res){
	res.render("login");
});

app.get("/register",function(req, res){
	res.render("register");
});

app.get("/secrets", function(req, res){
	if(req.isAuthenticated()){
		res.render('secrets');
	}else{
		res.redirect("/");
	}
});

app.get("/logout",function(req, res){
	req.logout();
	res.redirect('/login');
});

app.post("/register", function(req, res){

	User.register( {username: req.body.username}, req.body.password, function(err, user){
			if(err){
				console.log(err);
				res.redirect("/register");
			} else{
				passport.authenticate("local")(req, res, function(){
					res.redirect("/secrets");
				});
			}
		}
		);
});


app.post("/login", function(req, res){

	const user = new User({
		username: req.body.username,
		password: req.body.password
	});

	req.login(user, function(err){
		if(err){
			console.log(err);
		}else{
			passport.authenticate("local")(req, res, function(){
				res.redirect("/secrets");
			});
		}
	});
});






app.listen(3000,function(){
	console.log("app is running on port 3000");
});




// <script>
//   window.fbAsyncInit = function() {
//     FB.init({
//       appId      : '{your-app-id}',
//       cookie     : true,
//       xfbml      : true,
//       version    : '{api-version}'
//     });
      
//     FB.AppEvents.logPageView();   
      
//   };

//   (function(d, s, id){
//      var js, fjs = d.getElementsByTagName(s)[0];
//      if (d.getElementById(id)) {return;}
//      js = d.createElement(s); js.id = id;
//      js.src = "https://connect.facebook.net/en_US/sdk.js";
//      fjs.parentNode.insertBefore(js, fjs);
//    }(document, 'script', 'facebook-jssdk'));
// </script>