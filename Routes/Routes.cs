using System.Collections.Generic;
using System.Web.Mvc;
using System.Web.Routing;
using Orchard.Environment.Extensions;
using Orchard.Mvc.Routes;

namespace Nwazet.Nutshell.Routes {
    [OrchardFeature("Nwazet.Nutshell")]
    public class Routes : IRouteProvider {
        public void GetRoutes(ICollection<RouteDescriptor> routes) {
            foreach (var routeDescriptor in GetRoutes())
                routes.Add(routeDescriptor);
        }

        public IEnumerable<RouteDescriptor> GetRoutes() {
            return new[] {
                new RouteDescriptor {
                    Route = new Route(
                        "nutshell/{userName}/{fileName}",
                        new RouteValueDictionary {
                            {"area", "Nwazet.Nutshell"},
                            {"controller", "Home"},
                            {"action", "Index"},
                            {"userName", null},
                            {"fileName", null}
                        },
                        new RouteValueDictionary {
                        },
                        new RouteValueDictionary {
                            {"area", "Nwazet.Nutshell"}
                        },
                        new MvcRouteHandler())
                }
            };
        }

   }
}