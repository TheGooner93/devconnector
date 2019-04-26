const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const router = express.Router();

//Posts model
const Post = require("../../models/Post");
//Profile model
const Profile = require("../../models/Profile");

//Validation
const validatePostInput = require("../../validation/post");

//@route    GET api/posts/test
//@desc     Tests post route
//@access   Public
router.get("/test", (req, res) => res.json({ msg: "Posts works" }));

//@route    GET api/posts
//@desc     Read posts
//@access   Public
router.get("/", (req, res) => {
  Post.find()
    .sort({ date: -1 })
    .then(posts => res.json(posts))
    .catch(err => res.status(404).json({ nopostsfound: "No posts found" }));
});

//@route    GET api/posts/:id
//@desc     Read posts
//@access   Public
router.get("/:id", (req, res) => {
  Post.findById(req.params.id)
    .then(post => res.json(post))
    .catch(err =>
      res.status(404).json({ nopostfound: "No post found with that ID" })
    );
});

//@route    POST api/posts
//@desc     Create posts
//@access   Private
router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);

    if (!isValid) {
      //If any errors 400, with errors
      return res.status(400).json(errors);
    }

    const newPost = new Post({
      text: req.body.text,
      name: req.body.name,
      avatar: req.body.avatar,
      user: req.user.id
    });

    newPost.save().then(post => {
      res.json(post);
    });
  }
);

//@route    DELETE api/posts/:id
//@desc     Delete a post
//@access   Private
router.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id }).then(profile => {
      Post.findById(req.params.id).then(post => {
        //Check for post owner
        if (post.user.toString() !== req.user.id) {
          res.status(401).json({ notauthorized: "User not authorized" });
        }

        //Delete
        post
          .remove()
          .then(() => res.json({ success: true }))
          .catch(err =>
            res.status(404).json({ postnotfound: "Post not found" })
          );
      });
    });
  }
);

//@route    POST api/posts/like/:id
//@desc     Like post
//@access   Private
router.post(
  "/like/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id }).then(profile => {
      Post.findById(req.params.id).then(post => {
        if (
          post.likes.filter(like => like.user.toString() === req.user.id)
            .length > 0
        ) {
          return res
            .status(400)
            .json({ alreadyliked: "User has already liked this post" });
        }
        //Add user id to Likes array
        post.likes.unshift({ user: req.user.id });

        //Save to DB
        post
          .save()
          .then(post => res.json(post))
          .catch(err =>
            res.status(404).json({ postnotfound: "No post found" })
          );
      });
    });
  }
);

//@route    POST api/posts/unlike/:id
//@desc     Unlike post
//@access   Private
router.post(
  "/unlike/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id }).then(profile => {
      Post.findById(req.params.id).then(post => {
        if (
          post.likes.filter(like => like.user.toString() === req.user.id)
            .length === 0
        ) {
          return res
            .status(400)
            .json({ notliked: "User has not liked this post" });
        }
        //Get remove index
        const removeIndex = post.likes
          .map(item => item.user.toString())
          .indexOf(req.user.id);

        //Splice user out of array
        post.likes.splice(removeIndex, 1);

        //Save to DB
        post
          .save()
          .then(post => res.json(post))
          .catch(err =>
            res.status(404).json({ postnotfound: "No post found" })
          );
      });
    });
  }
);

//@route    POST api/posts/comment/:id
//@desc     Add Comments to post
//@access   Private
router.post(
  "/comment/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);

    if (!isValid) {
      //If any errors 400, with errors
      return res.status(400).json(errors);
    }

    Post.findById(req.params.id)
      .then(post => {
        const newComment = {
          text: req.body.text,
          name: req.body.name,
          avatar: req.body.avatar,
          user: req.user.id
        };

        //Add to comments array
        post.comments.unshift(newComment);

        //Save
        post
          .save()
          .then(post => res.json(post))
          .catch(err =>
            res.status(404).json({ postnotfound: "Post not found" })
          );
      })
      .catch(err => res.status(404).json({ postnotfound: "Post not found" }));
  }
);

//@route    DELETE api/posts/comment/:id/:comment_id
//@desc     Delete Comment from post
//@access   Private
router.delete(
  "/comment/:id/:comment_id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    // const { errors, isValid } = validatePostInput(req.body);

    // if (!isValid) {
    //   //If any errors 400, with errors
    //   return res.status(400).json(errors);
    // }

    Post.findById(req.params.id)
      .then(post => {
        //Check to see if comment exists
        if (
          post.comments.filter(
            comment => comment._id.toString() === req.params.comment_id
          ).length === 0
        ) {
          return res
            .json(404)
            .json({ commentnotexists: "Comment does not exist" });
        }

        //Find to comment to be deleted from the Comments array
        const removeIndex = post.comments
          .map(comment => comment._id.toString())
          .indexOf(req.params.comment_id);

        //Delete the comment
        post.comments.splice(removeIndex, 1);

        //Save
        post
          .save()
          .then(post => res.json(post))
          .catch(err =>
            res.status(404).json({ postnotfound: "Post not found" })
          );
      })
      .catch(err => res.status(404).json({ postnotfound: "Post not found" }));
  }
);

module.exports = router;
