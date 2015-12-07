angular.module("first-performance-global", ['ui.router'])
    .config([
    '$stateProvider',
    '$urlRouterProvider',
    function($stateProvider, $urlRouterProvider) {

      $stateProvider
        .state('home', {
          url: '/home',
          templateUrl: '/home.html',
          controller: 'mainCtrl',
          // making sure the post are loaded
          resolve: {
                postPromise: ['posts', function(posts){
                return posts.getAll();
                }]
            }
        })

        .state('posts', {
            url: '/posts/{id}',
            templateUrl: '/posts.html',
            controller: 'postsCtrl',
            resolve: {
                post: ['$stateParams', 'posts', function($stateParams, posts){
                    return posts.get($stateParams.id);
                }]
            }
        })

        .state('login', {
            url: '/login',
            templateUrl: '/login.html',
            controller: 'AuthCtrl',
            onEnter: ['$state', 'auth', function($state, auth){
                if(auth.isLoggedIn()){
                    $state.go('home');
                }}]
        })
        .state('register', {
            url: '/register',
            templateUrl: '/register.html',
            controller: 'AuthCtrl',
            onEnter: ['$state', 'auth', function($state, auth){
                if(auth.isLoggedIn()){
            $state.go('home');
            }}]
        });

      $urlRouterProvider.otherwise('home');
    }])

    //AUTHANTICATION
    .factory('auth', ['$http', '$window', function($http, $window){
        var auth = {};

         // for getting and setting our token to localStorage
        auth.saveToken = function (token){
            $window.localStorage['first-performance-token'] = token;
        };

        auth.getToken = function(){
            return $window.localStorage['first-performance-token'];
        }

        //return a boolean value for if the user is logged in
        auth.isLoggedIn = function(){
            var token = auth.getToken();

            if(token){
                var payload = JSON.parse($window.atob(token.split('.')[1]));

                return payload.exp > Date.now() / 1000;
            } else {
                return false;
            }
        };

         // returns the username of the user that's logged in.
        auth.currentUser = function(){
            if(auth.isLoggedIn()){
                var token = auth.getToken();
                var payload = JSON.parse($window.atob(token.split('.')[1]));

                return payload.username;
            }
        };
         // posts a user to  /register route and saves the token returned.
        auth.register = function(user){
            return $http.post('/register', user).success(function(data){
            auth.saveToken(data.token);
            });
        };

        //posts a user to /login route and saves the token returned.
        auth.logIn = function(user){
            return $http.post('/login', user).success(function(data){
            auth.saveToken(data.token);
            });
        };

        //removes the user's token from localStorage, logging the user out.
        auth.logOut = function(){
            $window.localStorage.removeItem('first-performance-token');
        };

        return auth;
    }])

    // injecting http servise to have access to database
    // service to send the JWT token to the server on authenticated requests
    .factory('posts', ['$http', 'auth', function($http, auth){
        var object = {
            posts: []
        };
        // retrive all posts
        object.getAll = function(){
            return $http.get('/posts').success(function(data){
                //retrieve posts from database
                angular.copy(data, object.posts);
            });
        };
        // retrives a single post
        object.get = function(id){
            return $http.get('/posts/' + id).then(function(res){
                return res.data;
            });
        };

        // creating new posts
        object.create = function(post){
            return $http.post('/posts', post,{
                headers: {Authorization: 'Bearer '+ auth.getToken()}
            }).success(function(data){
                object.posts.push(data);
            });
        };
        // add comment to a post
        object.addComment = function(id, comment){
            return $http.post('/posts/' + id + '/comments', comment, {
                headers: {Authorization: 'Bearer '+auth.getToken()}
            });
        };
        // upvotes posts
        object.upvote = function(post){
            return $http.put('/posts/' + post._id + '/upvote', null,{
                headers: {Authorization: 'Bearer '+auth.getToken()}
            }).success(function(data){
                post.upvotes += 1;
            });
        };
        // upvote comments
        object.upvoteComment = function(post, comment){
            return $http.put('/posts/' + post._id + '/comments/' + comment._id + '/upvote', null, {
                headers: {Authorization: 'Bearer '+auth.getToken()}
            }).success(function(data){
                comment.upvotes += 1;
            });
        };

        return object;
    }])

// ------------ CONTROLLERS ------------------
    //Auth Controller
    .controller('AuthCtrl', [
        '$scope',
        '$state',
        'auth',
        function($scope, $state, auth){
            $scope.user = {};

            $scope.register = function(){
            auth.register($scope.user).error(function(error){
                $scope.error = error;
            }).then(function(){
                $state.go('home');
            });
        };

        $scope.logIn = function(){
            auth.logIn($scope.user).error(function(error){
            $scope.error = error;
            }).then(function(){
                $state.go('home');
            });
            };
        }])
    // Navigation Controler
    .controller('NavCtrl', [
        '$scope',
        'auth',
        function($scope, auth){
            $scope.isLoggedIn = auth.isLoggedIn;
            $scope.currentUser = auth.currentUser;
            $scope.logOut = auth.logOut;
    }])
    // Main Controller
    .controller('mainCtrl', [
        '$scope',
        'posts',
        function($scope, posts){
            $scope.posts = posts.posts
            $scope.addPost = function(){
                if ($scope.title === ''){ return; }
                //save post to server
                posts.create({
                                        title: $scope.title,
                                        link: $scope.link
                                    });
                //this will remove the input in the form after I submit a post
                $scope.title = '';
                $scope.link = '';
            }
            // Angular variable
            $scope.incrementUpvotes = function(post){
                posts.upvote(post);
            }
    }])

    //Posts Controller
    .controller('postsCtrl', [
        '$scope',
        '$stateParams',
        'posts',
        'post',
        function($scope, $stateParams, posts, post){
            $scope.post = post;

        $scope.addComment = function(){
                // cannot submit an empty post
                if ($scope.body === ''){ return; }
                // add comment to an specific post
                posts.addComment(post._id, {

                                                body: $scope.body,
                                                author: 'user',
                                                 }).success(function(comment){
                                                    $scope.post.comments.push(comment);
                                                 });

            $scope.body = '';
        }

        $scope.incrementUpvotes = function(comment){
            posts.upvoteComment(post, comment);
        };
    }]);
//add a controller before the semi-colon
