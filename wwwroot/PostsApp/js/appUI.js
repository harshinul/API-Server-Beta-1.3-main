const periodicRefreshPeriod = 3;
let selectedCategory = "";
let currentETag = "";
let hold_Periodic_Refresh = false;
let showKeywords = true;
let minKeywordLenth = 2;
let pageManager = null;
let categories = [];
Init_UI();

function Init_UI() {
  pageManager = new PageManager(
    "scrollPanel",
    "itemsPanel",
    "postSample",
    renderPostsPaged
  );

  pageManager.show(true);
  setHeaderListMode();

  $("#createPost")
    .off()
    .on("click", function () {
      renderPostForm();
    });

  $("#aboutCmd")
    .off()
    .on("click", function () {
      renderAbout();
    });

  $(document).on("click", "#searchToggle", function () {
    if ($("#searchInputContainer").length === 0) {
      $("#searchArea").append(`
                <div id="searchInputContainer">
                    ${showSearch()[0].outerHTML}
                </div>
            `);
    }
    $("#searchInputContainer").toggleClass("active");
  });

  $(document).on("input", "#searchKeys", function () {
    $(".highlight").each(function () {
      $(this).replaceWith($(this).text());
    });
    pageManager.reset();
  });

  start_Periodic_Refresh();
}

function setHeaderListMode() {
  $("#createPost").show();
  $("#savePost").hide();
  $("#abort").hide();
  $("#dropdownMenu").show();
  $("#searchArea").show();
}

function setHeaderFormMode(showSave = true) {
  $("#createPost").hide();
  $("#dropdownMenu").hide();
  $("#searchArea").hide();
  $("#abort").show();
  if (showSave) $("#savePost").show();
  else $("#savePost").hide();
}
function updateDropDownMenu() {
  let DDMenu = $("#DDMenu");
  let selectClass = selectedCategory === "" ? "fa-check" : "fa-fw";
  DDMenu.empty();
  DDMenu.append(
    $(`
        <div class="dropdown-item menuItemLayout" id="allCatCmd">
            <i class="menuIcon fa ${selectClass} mx-2"></i> Toutes les catégories
        </div>
        `)
  );
  DDMenu.append($(`<div class="dropdown-divider"></div>`));
  categories.forEach((category) => {
    selectClass = selectedCategory === category ? "fa-check" : "fa-fw";
    DDMenu.append(
      $(`
            <div class="dropdown-item menuItemLayout category" data-category="${category}">
                <i class="menuIcon fa ${selectClass} mx-2"></i> ${category}
            </div>
        `)
    );
  });
  DDMenu.append($(`<div class="dropdown-divider"></div> `));
  DDMenu.append(
    $(`
        <div class="dropdown-item menuItemLayout" id="aboutCmd">
            <i class="menuIcon fa fa-info-circle mx-2"></i> À propos...
        </div>
        `)
  );
  $(document).on("click", "#allCatCmd", function () {
    selectedCategory = "";
    pageManager.reset();
  });

  $(document).on("click", ".category", function () {
    selectedCategory = $(this).data("category");
    pageManager.reset();
  });

  $(document).on("click", "#aboutCmd", function () {
    renderAbout();
  });
}


async function compileCategories() {
  categories = [];
  let response = await Posts_API.GetQuery("?select=Category&sort=Category");
  if (!Posts_API.error) {
    let items = response.data;
    if (items != null) {
      items.forEach((item) => {
        if (!categories.includes(item.Category)) categories.push(item.Category);
      });
      updateDropDownMenu();
    }
  }
}

async function renderPostsPaged(container, queryString) {

   
    queryString += "&sort=-Creation";

   
    if (selectedCategory !== "") {
        queryString += "&Category=" + encodeURIComponent(selectedCategory);
    }

   
    let keys = $("#searchKeys").val()?.trim();
    if (keys) {
        queryString += "&keywords=" + encodeURIComponent(keys);
    }

   
    await compileCategories();

  
    const response = await Posts_API.GetQuery(queryString);

    if (!response || !response.data) {
        return true; 
    }

    const rawPosts = response.data;

    
    const isLastPage = rawPosts.length < 3;  // pagination = 3 posts

    
    const posts = rawPosts;

  
    posts.forEach(p => container.append(renderPost(p)));

    
    container.find(".editCmd").off().on("click", function () {
        const id = $(this).attr("editPostId");
        renderEditPostForm(id);
    });

    
    container.find(".deleteCmd").off().on("click", function () {
        const id = $(this).attr("deletePostId");
        renderDeletePostForm(id);
    });

  
    container.find(".expandText").off().on("click", function () {
        let c = $(this).closest(".postContainerStyled");
        let t = c.find(".postText");
        t.removeClass("hideExtra").addClass("showExtra");
        c.find(".expandText").hide();
        c.find(".collapseText").show();
    });

    
    container.find(".collapseText").off().on("click", function () {
        let c = $(this).closest(".postContainerStyled");
        let t = c.find(".postText");
        t.removeClass("showExtra").addClass("hideExtra");
        c.find(".collapseText").hide();
        c.find(".expandText").show();
    });

    
    highlightKeywords();

    
    return isLastPage;
}



function start_Periodic_Refresh() {
  setInterval(async () => {
    if (!hold_Periodic_Refresh) {
      await Posts_API.Head();
      if (currentETag !== Posts_API.Etag) {
        currentETag = Posts_API.Etag;
        pageManager.reset();
      }
    }
  }, periodicRefreshPeriod * 1000);
}

function renderAbout() {
  hold_Periodic_Refresh = true;
  setHeaderFormMode(false);

  $("#scrollPanel").hide();
  $("#contentFormArea").remove();
  $("#content").append(`
        <div id="contentFormArea">
            <div class="aboutContainer">
                <h2>Gestionnaire de posts</h2>
                <hr>
                <p>Application monopage réactive démontrant la pagination, la recherche et l’édition.</p>
                <p>Auteur: Nicolas Chourot</p>
                <p>Collège Lionel-Groulx, Automne 2025</p>
            </div>
        </div>
    `);

  $("#abort")
    .off()
    .on("click", function () {
      hold_Periodic_Refresh = false;
      $("#contentFormArea").remove();
      $("#scrollPanel").show();
      setHeaderListMode();
      pageManager.reset();
    });
}

function renderCreatePostForm() {
  renderPostForm(null);
}

async function renderEditPostForm(id) {
  hold_Periodic_Refresh = true;
  setHeaderFormMode(true);

  $("#scrollPanel").hide();
  $("#contentFormArea").remove();
  $("#content").append(`
        <div id="contentFormArea">
            <div class='waitingGifcontainer'>
                <img class='waitingGif' src='Loading_icon.gif' />
            </div>
        </div>
    `);

  const data = await Posts_API.Get(id);
  if (!data) {
    renderError("Post introuvable!");
    return;
  }
  renderPostForm(data, true);
}

function renderPostForm(post = null, edit = false) {
  const create = post == null;
  let oldCreationDate;
  
  const checkboxHTML = edit ? `
    <label class="form-label">Conserver la date de création</label>
    <input type="checkbox" id="keepOldCreationDate" name="keepOldCreationDate" checked>
  ` : "";

  if (create) {
    post = {
      Id: 0,
      Title: "",
      Text: "",
      Category: "",
      Image: "images/no-image.png",
      Creation: Date.now(),
    }
  }
  else {
    oldCreationDate = post.Creation;
    post = {
      Id: post.Id,
      Title: post.Title,
      Text: post.Text,
      Category: post.Category,
      Image: post.Image || "images/no-image.png",
      Creation: Date.now(),
    }
  }

  hold_Periodic_Refresh = true;
  setHeaderFormMode(true);

  $("#scrollPanel").hide();
  $("#contentFormArea").remove();

  $("#content").append(`
        <div id="contentFormArea">
            <form class="form" id="postForm">
                <input type="hidden" name="Id" value="${post.Id}">
                <input type="hidden" name="Creation" value="${post.Creation}">

                <label for="Title" class="form-label">Titre</label>
                <input class="form-control" name="Title" id="Title"
                       placeholder="Titre" required value="${post.Title}">

                <label for="Text" class="form-label">Texte</label>
                <textarea class="form-control" name="Text" id="Text"
                          placeholder="Contenu du post" required>${post.Text}</textarea>

                <label for="Category" class="form-label">Catégorie</label>
                <input class="form-control" name="Category" id="Category"
                       placeholder="Catégorie" required value="${post.Category}">

                <label for="Image" class="form-label">Image</label>
                <div class='imageUploader'
                    newImage='${create}'
                    controlId='Image'
                    imageSrc='${post.Image}'
                    waitingImage="Loading_icon.gif">
                </div>
                
                ${checkboxHTML}
            </form>
        </div>
    `);

  initImageUploaders();
  initFormValidation();

  $("#savePost")
    .off()
    .on("click", async function () {
      let formData = getFormData($("#postForm"));

      // si l'utilisateur veut garder l'ancienne date
      if ($("#keepOldCreationDate").is(":checked") && !create) {
        formData.Creation = oldCreationDate;
      }
      else {
        formData.Creation = Date.now();
      }

      formData.Creation =
        parseInt(formData.Creation) || post.Creation || Date.now();

      $("#contentFormArea").html(`
            <div class='waitingGifcontainer'>
                <img class='waitingGif' src='Loading_icon.gif' />
            </div>
        `);

      const result = await Posts_API.Save(formData, create);
      if (!result) {
        renderError("Erreur lors de l'enregistrement.");
        return;
      }

      hold_Periodic_Refresh = false;
      $("#contentFormArea").remove();
      $("#scrollPanel").show();
      setHeaderListMode();
      pageManager.reset();
    });

  $("#abort")
    .off()
    .on("click", function () {
      hold_Periodic_Refresh = false;
      $("#contentFormArea").remove();
      $("#scrollPanel").show();
      setHeaderListMode();
      pageManager.reset();
    });
}

async function renderDeletePostForm(id) {
  hold_Periodic_Refresh = true;
  setHeaderFormMode(false);

  $("#scrollPanel").hide();
  $("#contentFormArea").remove();

  const data = await Posts_API.Get(id);
  if (!data) {
    renderError("Post introuvable!");
    return;
  }

  const post = data;

  const dateString = new Date(post.Creation).toLocaleDateString("fr-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }) + " – " + new Date(post.Creation).toLocaleTimeString("fr-CA");

  $("#content").append(`
    <div id="contentFormArea">
      <div class="postDeleteForm">
        
        <h3 style="margin-bottom:20px;">Effacer le post suivant ?</h3>

        <div class="postRow">
          <div class="postContainerStyled">

            <div class="postCategoryStyled">${post.Category.toUpperCase()}</div>

            <div class="postHeaderRow">
              <h2 class="postTitleLarge postTitle">${post.Title}</h2>
            </div>

            <img src="${post.Image}" class="postImageLarge">

            <div class="postDateStyled">${dateString}</div>

            <p class="postTextStyled showExtra">
              ${post.Text}
            </p>

          </div>
        </div>

        <div style="margin-top:25px;">
          <button id="confirmDelete" class="btn btn-danger">Effacer</button>
          <button id="cancelDelete" class="btn btn-secondary">Annuler</button>
        </div>

      </div>
    </div>
  `);

  $("#confirmDelete")
    .off()
    .on("click", async function () {
      await Posts_API.Delete(id);
      hold_Periodic_Refresh = false;
      $("#contentFormArea").remove();
      $("#scrollPanel").show();
      setHeaderListMode();
      pageManager.reset();
    });

  $("#cancelDelete")
    .off()
    .on("click", function () {
      hold_Periodic_Refresh = false;
      $("#contentFormArea").remove();
      $("#scrollPanel").show();
      setHeaderListMode();
      pageManager.reset();
    });

  $("#abort")
    .off()
    .on("click", function () {
      hold_Periodic_Refresh = false;
      $("#contentFormArea").remove();
      $("#scrollPanel").show();
      setHeaderListMode();
      pageManager.reset();
    });
}


function renderPost(post) {
  return $(`
        <div class="postRow" post_id="${post.Id}">
            <div class="postContainerStyled">

                <div class="postCategoryStyled">${post.Category.toUpperCase()}</div>

                <div class="postHeaderRow">
                    <h2 class="postTitleLarge postTitle">${post.Title}</h2>
                    <div class="postIcons">
                        <span class="editCmd cmdIcon fa fa-pencil"
                              editPostId="${post.Id}"></span>
                        <span class="deleteCmd cmdIcon fa fa-trash"
                              deletePostId="${post.Id}"></span>
                    </div>
                </div>

                <img src="${post.Image}" class="postImageLarge">

                <div class="postDateStyled">
                    ${new Date(post.Creation).toLocaleDateString("fr-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })} – ${new Date(post.Creation).toLocaleTimeString("fr-CA")}
                </div>

                <p class="postTextStyled postText hideExtra">
                    ${post.Text}
                </p>

                <div class="toggleTextContainer">
                    <span class="expandText fa fa-angles-down"></span>
                    <span class="collapseText fa fa-angles-up" style="display:none;"></span>
                </div>

            </div>
        </div>
    `);
}

function showSearch() {
  return $(`
        <input type="search" id="searchKeys"
               placeholder="Rechercher..."
               class="form-control"
               style="height:32px; padding:5px 10px; font-size:14px;">
    `);
}

function highlight(text, elem) {
  text = text.trim();
  if (text.length < minKeywordLenth) return;

  const html = elem.innerHTML;
  const norm = html.toLowerCase();
  const idx = norm.indexOf(text.toLowerCase());
  if (idx < 0) return;

  elem.innerHTML =
    html.substring(0, idx) +
    "<span class='highlight'>" +
    html.substring(idx, idx + text.length) +
    "</span>" +
    html.substring(idx + text.length);
}

function highlightKeywords() {
  const keys = $("#searchKeys").val();
  if (!keys) return;

  const words = keys.split(" ").filter((w) => w.length >= minKeywordLenth);

  words.forEach((k) => {
    $(".postTitle").each(function () {
      highlight(k, this);
    });
    $(".postText").each(function () {
      highlight(k, this);
    });
  });
}

function getFormData($form) {
  const removeTag = /(<[^>]+>)/g;
  let obj = {};
  $.each($form.serializeArray(), (_, c) => {
    obj[c.name] = c.value.replace(removeTag, "");
  });
  return obj;
}

function renderError(message) {
  $("#contentFormArea").remove();
  $("#scrollPanel").hide();
  $("#content").append(`
        <div id="contentFormArea">
            <div class="errorContainer">${message}</div>
        </div>
    `);
}
