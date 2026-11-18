// In-memory stand-in for the Firebase compat SDK, used only to render the
// app for guide screenshots. Trips come from window.__PUN_SEED (set by
// shoot.js); window.__PUN_NO_USER renders the signed-out login screen.
(function () {
  var seed = window.__PUN_SEED || [];
  var user = window.__PUN_NO_USER ? null
    : { uid: 'demo-user', email: 'demo@example.com', displayName: '小安', photoURL: null };
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var docRef = function () {
    return {
      set: function () { return Promise.resolve(); },
      update: function () { return Promise.resolve(); },
      delete: function () { return Promise.resolve(); },
      get: function () { return Promise.resolve({ exists: false, data: function () { return {}; } }); },
      onSnapshot: function (cb) {
        setTimeout(function () { cb({ exists: false, data: function () { return {}; } }); });
        return function () {};
      },
    };
  };
  var query = function (col, field) {
    return {
      onSnapshot: function (cb) {
        setTimeout(function () {
          cb({ docChanges: function () {
            if (col !== 'trips' || field !== 'ownerId') return [];
            return seed.map(function (t) {
              return { type: 'added', doc: { id: t.id, data: function () { return clone(t); } } };
            });
          } });
        });
        return function () {};
      },
    };
  };
  var db = {
    enablePersistence: function () { return Promise.resolve(); },
    collection: function (col) {
      return { doc: function (id) { return docRef(col, id); }, where: function (f) { return query(col, f); } };
    },
  };
  var auth = {
    isSignInWithEmailLink: function () { return false; },
    onAuthStateChanged: function (cb) { setTimeout(function () { cb(user); }); return function () {}; },
    signOut: function () { return Promise.resolve(); },
    currentUser: user,
  };
  var firestore = function () { return db; };
  firestore.FieldValue = { serverTimestamp: function () { return null; }, arrayUnion: function () { return []; } };
  var authFn = function () { return auth; };
  authFn.GoogleAuthProvider = function () {};
  window.firebase = { apps: [], initializeApp: function () { this.apps.push({}); }, firestore: firestore, auth: authFn };
})();
