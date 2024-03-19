var express = require('express');
var router = express.Router();
const userModel = require('./users');
const localStrategy = require("passport-local");
const passport = require('passport');
const upload=require('./multer');
const postModel=require('./post')
const util=require('../util/utils')
const storyModel=require("./story")

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
        res.redirect("/feed");
      })
    })
});

router.get('/feed', isLoggedIn, async function(req, res) {
  let user = await userModel
  .findOne({username: req.session.passport.user})
  .populate("posts");

  let stories = await storyModel.find({ user: { $ne: user._id } })
  .populate("user");

  let post = await postModel
  .find()
  .populate("user");

  res.render('feed', {footer: true, user, post, stories, dates:util.formatDateDifference});
});


router.get('/profile', async function(req, res,next) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate("posts");
  res.render('profile', {footer: true,user});
});
router.get('/profile/:usero', async function(req, res, next) {
  

    
      
     const currentUser = await userModel.findOne({ username: req.session.passport.user }).populate("posts");
    

    
    const requestedUser = await userModel.findOne({ _id: req.params.usero }).populate("posts");

    if (currentUser.username === requestedUser.username) {
      
      res.render('profile', { footer: true, user: currentUser });
    } else{
      
      res.render('profile1', { footer: true, user: requestedUser ,user1:currentUser });
    }
  
});
//acess follow and following in jsaon
router.get('/follow/:userid', isLoggedIn, async function(req, res) {
  let followKarneWaala = await userModel
  .findOne({username: req.session.passport.user})
  
  let followHoneWaala = await userModel
  .findOne({_id: req.params.userid})

  if(followKarneWaala.following.indexOf(followHoneWaala._id) !== -1){
    let index = followKarneWaala.following.indexOf(followHoneWaala._id);
    followKarneWaala.following.splice(index, 1);

    let index2 = followHoneWaala.followers.indexOf(followKarneWaala._id);
    followHoneWaala.followers.splice(index2, 1);
  }
  else{
    followHoneWaala.followers.push(followKarneWaala._id);
    followKarneWaala.following.push(followHoneWaala._id);
  }

  await followHoneWaala.save();
  await followKarneWaala.save();

  res.redirect("back");
});

router.get('/search/:user?', async function (req, res) {
  if (req.params.user) {
    // If a username is provided in the URL, perform a search and respond with JSON
    const searchTerm = `^${req.params.user}`;
    const regex = new RegExp(searchTerm, 'i');
    const users = await userModel.find({ username: { $regex: regex } });
    res.json(users);
  } else {
    // If no username is provided, retrieve the currently logged-in user and render the view
    const user = await userModel.find({ username: req.session.passport.user });
    res.render('search', { footer: true, user });
  }
});




router.get('/edit',isLoggedIn,async function(req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render('edit', {footer: true,user});
});

router.get('/upload', async function(req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });

  res.render('upload', {footer: true,user});
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
  //story and post routed

router.post('/uploads',upload.single('image') ,async function(req,res,next){
  const user = await userModel.findOne({ username: req.session.passport.user });


  if(req.body.category === "post"){
    const post = await postModel.create({
      user: user._id,
      caption: req.body.caption,
      media: req.file.filename,
    })
    user.posts.push(post._id);
  }
  else if(req.body.category === "story"){
    let story = await storyModel.create({
      story: req.file.filename,
      user: user._id
    });
    user.stories.push(story._id);
  }
  else{
    res.send("tez mat chalo");
  }
  
  await user.save();
  res.redirect("/feed");
})
router.get('/like/:postid', async function(req, res) {
  const post = await postModel.findOne({_id: req.params.postid});
  const user = await userModel.findOne({username: req.session.passport.user});
  if(post.likes.indexOf(user._id) === -1){
    post.likes.push(user._id);
  }
  else{
    post.likes.splice(post.like.indexOf(user._id), 1);
  }
  await post.save();
  res.json(post);
});
module.exports = router;