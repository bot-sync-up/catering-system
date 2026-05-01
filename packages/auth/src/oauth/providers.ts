/**
 * OAuth providers — Google + Facebook (passport)
 * מחזיר RequestHandlers; integration מלא בקובץ ה-routes.
 */
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { loadConfig } from '../config';
import { OAuthProfile } from '../types';

export function configureOAuth(): void {
  const cfg = loadConfig();

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((obj: Express.User, done) => done(null, obj));

  if (cfg.GOOGLE_CLIENT_ID && cfg.GOOGLE_CLIENT_SECRET && cfg.GOOGLE_CALLBACK_URL) {
    passport.use(new GoogleStrategy({
      clientID: cfg.GOOGLE_CLIENT_ID,
      clientSecret: cfg.GOOGLE_CLIENT_SECRET,
      callbackURL: cfg.GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email'],
    }, (_at, _rt, profile, done) => {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error('No email from Google'));
      const out: OAuthProfile = {
        provider: 'google',
        providerUserId: profile.id,
        email,
        fullName: profile.displayName,
      };
      return done(null, out);
    }));
  }

  if (cfg.FACEBOOK_APP_ID && cfg.FACEBOOK_APP_SECRET && cfg.FACEBOOK_CALLBACK_URL) {
    passport.use(new FacebookStrategy({
      clientID: cfg.FACEBOOK_APP_ID,
      clientSecret: cfg.FACEBOOK_APP_SECRET,
      callbackURL: cfg.FACEBOOK_CALLBACK_URL,
      profileFields: ['id', 'emails', 'displayName'],
    }, (_at, _rt, profile, done) => {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error('No email from Facebook'));
      const out: OAuthProfile = {
        provider: 'facebook',
        providerUserId: profile.id,
        email,
        fullName: profile.displayName,
      };
      return done(null, out);
    }));
  }
}

export { passport };
