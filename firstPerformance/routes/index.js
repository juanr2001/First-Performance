var express = require('express');
var jwt = require('express-jwt');
var router = express.Router();
// userPropery option specifies which property on req to put our payload from tokens.
// using payload instead, to avoid any conflicts with passport both apparently uses the same default name(user)
var auth = jwt({secret: 'SECRET', userProperty: 'payload'});

// GET home page.
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});
//dependency
var mongoose = require('mongoose');
var passport = require('passport');
//requiring post and comment Models
var Post = mongoose.model('Post');
var Comment = mongoose.model('Comment');
var User = mongoose.model('User');

// ------------------ REGISTER ----------------------
router.post('/register', function(req, res, next){
    if(!req.body.username || !req.body.password){
        return res.status(400).json({message: 'Please fill out all fields'});
    }

    var user = new User();
    user.username = req.body.username;
    user.setPassword(req.body.password)
    user.save(function (err){
    if(err){ return next(err); }

        return res.json({token: user.generateJWT()})
    });
});

// ------------------ LOG IN ----------------------
router.post('/login', function(req, res, next){
    if(!req.body.username || !req.body.password){
        return res.status(400).json({message: 'Please fill out all fields'});
    }

    passport.authenticate('local', function(err, user, info){
    if(err){ return next(err); }

    if(user){
        return res.json({token: user.generateJWT()});
    } else {
        // return what when wrong
        return res.status(401).json(info);
    }
    })(req, res, next);
});

//------------------ POSTS Routes ------------------------
router.get('/posts',function(req, res, next){
    Post.find(function(err, posts){
        if(err) { return next(err); }

        res.json(posts);
    });
});

router.post('/posts', auth, function(req, res, next){
    var post = new Post(req.body);
    post.author = req.payload.username;

    post.save(function(err, post){
        if (err) {return next(err); }
        res.json(post);
    });
});

// route for preloading post objects in routes/index.js
router.param('post', function(req, res, next, id) {
    var query = Post.findById(id);

    query.exec(function(err, post){
        if (err) { return next(err); }
        if (!post) { return next(new Error('can\'t find post')); }

        req.post = post;
        return next();
    });
});

// route for returning a single post
// populate() method, I can automatically load all the comments associated with that particular post
router.get('/posts/:post', function(req, res) {
    req.post.populate('comments', function(err, post){
   res.json(post);
    });
});

//---------------------  POST VOTE ------------------------
router.put('/posts/:post/upvote', auth, function(req, res, next){
    req.post.upvote(function(err, post){
        if(err){ return next(err);}
        res.json(post);
    });
});

// ------------------- COMMENTS -----------------------

// comments route for a particular post
router.post('/posts/:post/comments', auth, function(req, res, next){
    var comment = new Comment(req.body);
    comment.post = req.post;
    comment.author = req.payload.username;

    comment.save(function(err, comment){
        if(err){return next(err);}

        req.post.comments.push(comment);
        req.post.save(function(err, post){
            if (err){return next(err);}
            res.json(comment);

        });
    });
});

router.param('comment', function(req, res, next, id) {
    var query = Comment.findById(id);

    query.exec(function(err, comment){
        if (err) { return next(err); }
        if (!comment) { return next(new Error('can\'t find comment')); }

        req.comment = comment;
        return next();
    });
});

//---------------------  COMMENT VOTE ------------------------
router.put('/posts/:post/comments/:comment/upvote', auth, function(req, res, next){
    req.comment.upvote(function(err, comment){
        if(err){ return next(err);}
        res.json(comment);
    });
});

module.exports = router;
