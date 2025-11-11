const periodicRefreshPeriod = 3;
let contentScrollPosition = 0;
let selectedCategory = "";
let currentETag = "";
let hold_Periodic_Refresh = false;

Init_UI();

function Init_UI() {
    renderPosts();
    $('#createPost').on("click", async function () {
        saveContentScrollPosition();
        renderCreatePostForm();
    });
    $('#savePost').on("click", async function () {
        renderPosts();
    });
    $('#abort').on("click", async function () {
        renderPosts();
    });
    $('#aboutCmd').on("click", function () {
        renderAbout();
    });
    start_Periodic_Refresh();
}

function start_Periodic_Refresh() {
    setInterval(async () => {
        if (!hold_Periodic_Refresh) {
            await Posts_API.Head();
            if (currentETag != Posts_API.Etag) {
                currentETag = Posts_API.Etag;
                saveContentScrollPosition();
                renderPosts();
            }
        }
    }, periodicRefreshPeriod * 1000);
}

function renderAbout() {
    hold_Periodic_Refresh = true;
    saveContentScrollPosition();
    eraseContent();
    $("#createPost").hide();
    $("#dropdownMenu").hide();
    $("#abort").show();
    $("#actionTitle").text("À propos...");
    $("#content").append(`
        <div class="aboutContainer">
            <h2>Gestionnaire de posts</h2>
            <hr>
            <p>Application de gestion de posts démontrant une interface monopage réactive.</p>
            <p>Auteur: Nicolas Chourot</p>
            <p>Collège Lionel-Groulx, Automne 2025</p>
        </div>
    `);
}

function updateDropDownMenu(categories) {
    let DDMenu = $("#DDMenu");
    let selectClass = selectedCategory === "" ? "fa-check" : "fa-fw";
    DDMenu.empty();
    DDMenu.append(`
        <div class="dropdown-item menuItemLayout" id="allCatCmd">
            <i class="menuIcon fa ${selectClass} mx-2"></i> Toutes les catégories
        </div>
    `);
    DDMenu.append(`<div class="dropdown-divider"></div>`);
    categories.forEach(category => {
        selectClass = selectedCategory === category ? "fa-check" : "fa-fw";
        DDMenu.append(`
            <div class="dropdown-item menuItemLayout category">
                <i class="menuIcon fa ${selectClass} mx-2"></i> ${category}
            </div>
        `);
    });
    DDMenu.append(`<div class="dropdown-divider"></div>`);
    DDMenu.append(`
        <div class="dropdown-item menuItemLayout" id="aboutCmd">
            <i class="menuIcon fa fa-info-circle mx-2"></i> À propos...
        </div>
    `);
    $('#aboutCmd').on("click", function () {
        renderAbout();
    });
    $('#allCatCmd').on("click", function () {
        selectedCategory = "";
        renderPosts();
    });
    $('.category').on("click", function () {
        selectedCategory = $(this).text().trim();
        renderPosts();
    });
}

function compileCategories(posts) {
    let categories = [];
    if (posts != null) {
        posts.forEach(post => {
            if (!categories.includes(post.Category))
                categories.push(post.Category);
        });
        updateDropDownMenu(categories);
    }
}

async function renderPosts() {
    hold_Periodic_Refresh = false;
    showWaitingGif();
    $("#actionTitle").text("Liste des posts");
    $("#createPost").show();
    $("#dropdownMenu").show();
    $("#savePost").hide();
    $("#abort").hide();
    let posts = await Posts_API.Get();
    currentETag = Posts_API.Etag;
    compileCategories(posts);
    eraseContent();
    if (posts !== null) {
        posts.forEach(post => {
            if ((selectedCategory === "") || (selectedCategory === post.Category))
                $("#content").append(renderPost(post));
        });
        restoreContentScrollPosition();

        // attach edit/delete
        $(".editCmd").on("click", function () {
            saveContentScrollPosition();
            renderEditPostForm($(this).attr("editPostId"));
        });
        $(".deleteCmd").on("click", function () {
            saveContentScrollPosition();
            renderDeletePostForm($(this).attr("deletePostId"));
        });
    } else {
        renderError();
    }
}

function showWaitingGif() {
    $("#content").empty();
    $("#content").append(`<div class='waitingGifcontainer'><img class='waitingGif' src='Loading_icon.gif' /></div>`);
}

function eraseContent() {
    $("#content").empty();
}

function saveContentScrollPosition() {
    contentScrollPosition = $("#content")[0].scrollTop;
}

function restoreContentScrollPosition() {
    $("#content")[0].scrollTop = contentScrollPosition;
}

function renderError(message = "") {
    message = (message == "" ? Posts_API.currentHttpError : message);
    eraseContent();
    $("#content").append(`<div class="errorContainer">${message}</div>`);
}

function renderCreatePostForm() {
    renderPostForm();
}

async function renderEditPostForm(id) {
    showWaitingGif();
    let post = await Posts_API.Get(id);
    if (post !== null)
        renderPostForm(post);
    else
        renderError("Post introuvable!");
}

async function renderDeletePostForm(id) {
    showWaitingGif();
    $("#createPost").hide();
    $("#dropdownMenu").hide();
    $("#savePost").show();
    $("#abort").show();
    $("#actionTitle").text("Retrait");
    let post = await Posts_API.Get(id);
    eraseContent();
    if (post !== null) {
        $("#content").append(`
        <div class="postDeleteForm">
            <h4>Effacer le post suivant?</h4><br>
            <div class="postRow" post_id="${post.Id}">
                <div class="postContainer noselect">
                    <div class="postLayout">
                    <img src="${post.Image}" class="postImage" alt="${post.Title}" />
                        <div class="post">
                            <span class="postTitle">${post.Title}</span>
                        </div>
                        <span class="postCategory">${post.Category}</span>
                    </div>
                </div>
            </div>
        </div>
        `);
        // bouton global = confirmation suppression
        $('#savePost').off("click").on("click", async function () {
            showWaitingGif();
            let result = await Posts_API.Delete(post.Id);
            if (result)
                renderPosts();
            else
                renderError();
        });

        $('#abort').off("click").on("click", function () {
            renderPosts();
        });

    } else {
        renderError("Post introuvable!");
    }
}

function getFormData($form) {
    const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
    var jsonObject = {};
    $.each($form.serializeArray(), (index, control) => {
        jsonObject[control.name] = control.value.replace(removeTag, "");
    });
    return jsonObject;
}

function newPost() {
    return { Id: 0, Title: "", Text: "", Category: "", Image: "", Creation: Date.now() };
}

function renderPostForm(post = null) {
    hold_Periodic_Refresh = true;
    $("#createPost").hide();
    $("#dropdownMenu").hide();
    $("#savePost").show();
    $("#savePost").show();
    $("#abort").show();
    eraseContent();

    let create = post == null;
    if (create) {
        post = newPost();
        post.Image = "images/no-image.png"; // image par défaut
    }

    $("#actionTitle").text(create ? "Création" : "Modification");

    $("#content").append(`
        <form class="form" id="postForm">
            <input type="hidden" name="Id" value="${post.Id}"/>

            <label for="Title" class="form-label">Titre </label>
            <input 
                class="form-control Alpha"
                name="Title" 
                id="Title" 
                placeholder="Titre"
                required
                RequireMessage="Veuillez entrer un titre"
                InvalidMessage="Le titre comporte un caractère illégal"
                value="${post.Title}"
            />

            <label for="Text" class="form-label">Texte </label>
            <textarea
                class="form-control"
                name="Text"
                id="Text"
                placeholder="Contenu du post"
                required
                RequireMessage="Veuillez entrer le texte du post"
            >${post.Text}</textarea>

            <label for="Category" class="form-label">Catégorie </label>
            <input 
                class="form-control"
                name="Category"
                id="Category"
                placeholder="Catégorie"
                required
                RequireMessage="Veuillez entrer une catégorie"
                value="${post.Category}"
            />

            <!-- nécessite le fichier javascript 'imageControl.js' -->
            <label for="Image" class="form-label">Image </label>
            <div   class='imageUploader' 
                   newImage='${create}' 
                   controlId='Image' 
                   imageSrc='${post.Image}' 
                   waitingImage="Loading_icon.gif">
            </div>
        </form>
    `);

    // Initialise les contrôles d'image et la validation du formulaire
    initImageUploaders();
    initFormValidation();


    // Nettoyer anciens événements du header avant d’en attacher
    $('#savePost').off("click").on("click", async function () {
        let formData = getFormData($("#postForm"));

        const imageInput = $(`#Image`); // input hidden ajouté par imageControl.js
        if (imageInput.length) {
            formData.Image = imageInput.val();
        } else {
            formData.Image = post.Image; // fallback si rien sélectionné
        }

        formData.Creation = post.Creation || Date.now();
        showWaitingGif();
        let result = await Posts_API.Save(formData, create);
        if (result)
            renderPosts();
        else if (Posts_API.currentStatus == 409)
            renderError("Erreur: Conflit de titres...");
        else
            renderError();
    });

    $('#abort').off("click").on("click", function () {
        renderPosts();
    });
}



function renderPost(post) {
    return $(`
        <div class="postRow" post_id="${post.Id}">
            <div class="postContainer noselect">
                <div class="postLayout">
                    <div class="post">
                        <img src="${post.Image}" class="postImage" alt="${post.Title}" />
                        <span class="postTitle">${post.Title}</span>
                        <p class="postText">${post.Text}</p>
                    </div>
                    <span class="postCategory">${post.Category}</span>
                    <span class="postDate">${new Date(post.Creation).toLocaleDateString()}</span>
                </div>
                <div class="postCommandPanel">
                    <span class="editCmd cmdIcon fa fa-pencil" editPostId="${post.Id}" title="Modifier ${post.Title}"></span>
                    <span class="deleteCmd cmdIcon fa fa-trash" deletePostId="${post.Id}" title="Effacer ${post.Title}"></span>
                </div>
            </div>
        </div>
    `);
}
