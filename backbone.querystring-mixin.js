/**
 * This is a series of Mixins that enables Backbone Routers to
 * respect querystrings and automatically handle serialization and
 * deserialization to make them easier to work with.
 *
 * To get querystring params provided to your in your route callbacks,
 * extend your router definitions (or Backbone.Router):
 *
 *   _.extend(MyApp.Router.prototype, Backbone.Mixins.QuerystringRoutes);
 *
 * To create a valid route with querystring parameters, call:
 *
 *   MyApp.route.navigate(MyApp.router.toFragment([route], [params]))
 *   (see comments for more information)
 *
 * Requires:
 *   Backbone.js
 *   Underscore.js
 *   jQuery
 *   jquery.deparam.js (https://github.com/chrissrogers/jquery-deparam)
 */
(function(Backbone, _) {

  Backbone.Router.arrayValueSplit = '|';

  Backbone.Mixins = Backbone.Mixins || {};

  Backbone.Mixins.QuerystringRoutes = (function () {
    var querystringParam = /^\?(.*)/;
    var routeParam = /[:*][\w]+/g;
    var namedParam = /\(\[\^\\?\/\]\+\)/g;
    var splatParam = /\(\.\*\?\)/g;
    var _routeToRegExp = Backbone.Router.prototype._routeToRegExp;
    var _extractParameters = Backbone.Router.prototype._extractParameters;

    return {

      // Return a valid fragment given routes and params
      // To use:
      //   toFragment('page/:id', { id: 9, show: true }) => page/1?show=true
      //   toFragment('page/:a/:b', 1, 2, { c: 'd' }) => page/1/2?c=d
      toFragment: function(route, params) {
        var matches = route.match(routeParam) || [];
        var qsParams = _.last(arguments);
        qsParams = _.isObject(qsParams) ? qsParams : null;

        // substitute variables
        if(arguments.length == 2 && qsParams) {
          qsParams = _.clone(qsParams);
          for(var i = 0, l = matches.length; i < l; i++) {
            var key = matches[i].substr(1);
            route = route.replace(matches[i], qsParams[key] || '');
            delete qsParams[key];
          }
        } else {
          for(var i = 0, l = matches.length, a = 1; i < l; i++, a++) {
            route = route.replace(matches[i], 
                (a < arguments.length - (qsParams ? 1 : 0) ? arguments[a] : ''));
          }
        }

        // Add querystring if necessary
        if(!_.isEmpty(qsParams)) {
          route += (route.indexOf('?') < 0 ? '?' : '&');
          route += this._toQuerystring(qsParams);
        }
        return route;
      },

      // Add query string selector to converted paths
      _routeToRegExp: function(route) {
        // get expected regex
        var route = _routeToRegExp.apply(this, arguments).toString();

        // alter named and splat param regexes
        route = route.replace(namedParam, "([^\/?]*)");
        route = route.replace(splatParam, "([^\?]*)");

        // adjust route to append querystring params regex
        route = route.substr(1, route.length - 3);
        return new RegExp(route + '([\?]{1}.*)?' + '$');
      },

      // extract query string parameters on top of everything else
      _extractParameters: function(route, fragment) {
        var params = _extractParameters.apply(this, arguments);

        // do we have an additional query string?
        var match = params.length && params[params.length-1] &&
          params[params.length-1].match(querystringParam);
        if (match) {
          var querystring = match[1];
          var querystringParams = this._fromQuerystring(querystring);
          params[params.length-1] = querystringParams;
        }

        return params;
      },

      // Takes an object and serializes it into querystring form
      // Override this to handle different serialization formats
      _toQuerystring: function(params) {
        return $.param(params);
      },

      // Takes a querystring (i.e. a=1&b=2), and turns it into a javascript object.
      // Override this to handle different serialization formats
      _fromQuerystring: function(querystring) {
        try {
          return $.deparam(querystring);
        } catch (e) {
          if(console && console.error) {
            console.error('Could not parse query string', e);
          }
          return {};
        }
      }

    };
  })();

})(Backbone, _);
