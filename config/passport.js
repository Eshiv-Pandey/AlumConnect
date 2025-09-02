// config/passport.js
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const bcrypt = require("bcryptjs");
const User = require("../models/User");

module.exports = function (passport) {
  // --- Google OAuth ---
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL ||
          "http://localhost:4000/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value || null;

          let user = await User.findOne({ googleId: profile.id });
          if (user) return done(null, user);

          if (email) {
            // Merge with existing local or other provider account by email
            user = await User.findOne({ email });
            if (user) {
              user.googleId = profile.id;
              user.name = user.name || profile.displayName;
              await user.save();
              return done(null, user);
            }
          }

          // Create new user
          user = await User.create({
            googleId: profile.id,
            email: email, // may be null (rare), but Google usually returns email
            name: profile.displayName,
            role: "student",
          });

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );

  // --- GitHub OAuth ---
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL:
          process.env.GITHUB_CALLBACK_URL ||
          "http://localhost:4000/auth/github/callback",
        scope: ["user:email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // GitHub can hide emails; fallback to noreply if needed
          const email =
            profile.emails?.[0]?.value ||
            (profile.username
              ? `${profile.username}@users.noreply.github.com`
              : null);

          let user = await User.findOne({ githubId: profile.id });
          if (user) return done(null, user);

          if (email) {
            // Merge with existing local/Google account
            user = await User.findOne({ email });
            if (user) {
              user.githubId = profile.id;
              user.name = user.name || profile.displayName || profile.username;
              await user.save();
              return done(null, user);
            }
          }

          // Create new user
          user = await User.create({
            githubId: profile.id,
            email,
            name: profile.displayName || profile.username,
            role: "student",
          });

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
};
