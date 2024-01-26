var express = require('express');
var router = express.Router();
const userModel = require('./users');
const localStrategy = require("passport-local");
const passport = require('passport');
const upload=require('./multer');
const postModel=require('./post')
const util=require('../util/utils')


passport.use(new localStrategy(userModel.authenticate()));

router.get('/', function(req, res) {
  res.render('index', {footer: false});
});

router.get('/login', function(req, res) {
  res.render('login', {footer: false});
});
//user
router.post('/register', (req, res) => {
  var userdata = new userModel({
    username: req.body.username,
    name:req.body.name,
    email:req.body.email
  });

  userModel.register(userdata, req.body.password)
    .then(function (registereduser) {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/profile");
      })
    })
});

router.get('/feed',async function(req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate("posts");
  const post=await postModel.find();
  console.log(post);
  res.render('feed', {footer: true,user,post,dates:util.formatDateDifference});
});

router.get('/profile', async function(req, res,next) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate("posts");
  res.render('profile', {footer: true,user});
});

router.get('/search', function(req, res) {
  res.render('search', {footer: true});
});

router.get('/edit',isLoggedIn,async function(req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render('edit', {footer: true,user});
});

router.get('/upload', function(req, res) {
  res.render('upload', {footer: true});
});

//upload
router.post('/upload',isLoggedIn, upload.single("image"),  async function(req, res) {
const user=await userModel.findOne({username:req.session.passport.user});
user.image=req.file.filename;
await user.save();
  res.render('edit', {footer: true,user});
  
});
//update
router.post('/update',isLoggedIn,async function(req,res,next){
  const user=await userModel.findOneAndUpdate({username:req.session.passport.user},{username:req.body.username,name:req.body.name,bio:req.body.bio},{new:true})
  req.login(user, function (err) {
    if (err) {
      // Handle login error
      console.error('Login error:', err);
      return res.status(500).json({ message: 'Login error', error: err });
    }
  
    // Login successful, redirect to the profile page
    res.redirect('/profile');
  });
  
  
})
//login
router.post("/login",passport.authenticate("local",{
  successRedirect:"/profile",
  failureRedirect:"/login"
}), (req,res)=>{
});
//logout
router.get('/logout', (req,res, next)=>{
  req.logout((err)=>{
    if(err){
      return next(err);
    }
    res.redirect('/');
  })
})
//islogginu
function isLoggedIn( req,res,next){
  if(req.isAuthenticated()){
    return next();
  }
  res.redirect('/');
}
router.post('/uploads',upload.single('image') ,async function(req,res,next){
  const user = await userModel.findOne({ username: req.session.passport.user });

  

    const post = await postModel.create({
      media: req.file.filename,
      caption: req.body.caption,
      user: user._id,
    });

    user.posts.push(post._id);
    await user.save();

    res.redirect('/profile');
})

module.exports = router;