using System.Linq;
using System.Web.Mvc;
using Nwazet.Nutshell.Models;
using Orchard;
using Orchard.Environment.Extensions;
using Orchard.Themes;
using Vandelay.Industries.Services;

namespace Nwazet.Nutshell.Controllers {
    [OrchardFeature("Nwazet.Nutshell")]
    public class HomeController :  Controller {
        private const string Folder = "Nwazet Nutshell";
        private const string ThumbnailFolder = "Nwazet Nutshell Thumbnails";

        private readonly IWorkContextAccessor _wca;
        private readonly IUserStorageService _storageService;

        public HomeController(IWorkContextAccessor wca, IUserStorageService storageService) {
            _wca = wca;
            _storageService = storageService;
        }

        [Themed(false)]
        public ActionResult Index(string userName = null, string fileName = null) {
            var currentUser = _wca.GetContext().CurrentUser;
            var currentUserName = currentUser == null ? null : currentUser.UserName;
            var model = new NutshellViewModel {
                UserName = userName ?? currentUserName,
                FileName = fileName
            };
            return View(model);
        }

        public ActionResult Save(string fileName, string program, string thumbnail) {
            var currentUser = _wca.GetContext().CurrentUser;
            var currentUserName = currentUser == null ? null : currentUser.UserName;
            _storageService.Save(Folder, fileName, program, currentUserName);
            _storageService.Save(ThumbnailFolder, fileName, thumbnail, currentUserName);
            return new JsonResult();
        }

        public ActionResult ListFiles() {
            var currentUser = _wca.GetContext().CurrentUser;
            var currentUserName = currentUser == null ? null : currentUser.UserName;
            var files = _storageService.GetFiles(Folder, currentUserName);
            var thumbnails = _storageService
                .Load(ThumbnailFolder, files, currentUserName);
            var result = new JsonResult();
            result.Data = files
                .Select(f => new {
                    FileName = f,
                    Thumbnail = thumbnails[f]
                });
            return result;
        }
    }
}