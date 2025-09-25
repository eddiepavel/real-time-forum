document.addEventListener('DOMContentLoaded', function () {
    const loginbtn = document.getElementById('loginbtn');
    const logindialog = document.getElementById('loginDialog');
    const loginForm = logindialog?.querySelector('form');
    const usernameInput = document.getElementById('login_username');
    const passwordInput = document.getElementById('login_password');
    const registerbtn = document.getElementById('registerbtn');
    const registerDialog = document.getElementById('registerDialog');
    const registerForm = registerDialog?.querySelector('form');
    const regUsernameInput = document.getElementById('reg_username');
    const regEmailInput = document.getElementById('reg_email');
    const regPasswordInput = document.getElementById('reg_password');
    const regConfirmPasswordInput = document.getElementById('confirm_password');
    const regCancelBtn = document.getElementById('cancelbtn2');
    const newPostBtn = document.getElementById('newpostbtn');
    const posts = document.getElementById('posts');
    const newPostDialog = document.getElementById('newPostDialog');
    const newPostForm = newPostDialog?.querySelector('form');
    const cancelPostBtn = document.getElementById('cancelPostBtn');
    const postTitleInput = document.getElementById('post_title');
    const postBodyInput = document.getElementById('post_content');
    const postCategoryInput = document.getElementById('post_category');
    const postImageInput = document.getElementById('post_image');
    const postsList = document.getElementById('postsList');
    const loginPrompt = document.getElementById('loginPrompt');
    const postProfile = document.getElementById('postProfile');
    const postProfileContent = document.getElementById('postProfileContent');
    const closePostProfile = document.getElementById('closePostProfile');
    const commentsSection = document.getElementById('commentSection');
    const commentsList = document.getElementById('commentsList');
    const commentForm = document.getElementById('commentForm');
    const commentInput = document.getElementById('commentInput');

    let currentPost = null;

    // Modal logic
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const closeImageModal = document.getElementById('closeImageModal');

    function showImageModal(src) {
        modalImage.src = src;
        imageModal.classList.remove('opacity-0', 'pointer-events-none');
        imageModal.classList.add('opacity-100');
    }
    function hideImageModal() {
        imageModal.classList.add('opacity-0', 'pointer-events-none');
        imageModal.classList.remove('opacity-100');
        modalImage.src = '';
    }
    closeImageModal.onclick = hideImageModal;
    imageModal.onclick = function(e) {
        if (e.target === imageModal) hideImageModal();
    };

    function showPostProfile(post) {
        currentPost = post;
        author = post.author.canEdit ? "You" : post.author.username;
        postsList.childNodes.forEach(li => li.classList.add('hidden'));
        postProfileContent.innerHTML = `
            <div class="flex w-full justify-between bg-white p-8 rounded">
                <div class="flex-row">
                    <h2 class="text-xl font-bold mb-2">${post.title}</h2>
                    <p class="text-sm text-gray-500 mb-1">By: ${author} on ${new Date(post.created_at).toLocaleString()}</p>
                    <p class="mb-2">${post.content}</p>
                    <p class="text-sm text-gray-500">Category: ${post.category.charAt(0).toUpperCase() + post.category.slice(1)}</p>
                </div>
                ${post.image ? `<img src="/images/${post.image.String}" alt="Post Image" class="mt-2 max-w-80 h-auto rounded cursor-pointer" id="postProfileImage">` : ''}
            </div>
        `;
        postsList.style.maxHeight = postProfileContent.offsetHeight + commentsSection.offsetHeight + "px";
        posts.style.maxHeight = postProfileContent.offsetHeight + commentsSection.offsetHeight + "px";
        const img = document.getElementById('postProfileImage');
        if (img) img.onclick = () => showImageModal(img.src);
        // loadComments(post.id);
        postProfile.classList.remove('-translate-x-full', 'opacity-0');
        postProfile.classList.add('translate-x-0', 'opacity-100');
    }

    function hidePostProfile() {
        postProfile.classList.remove('translate-x-0', 'opacity-100');
        postProfile.classList.add('-translate-x-full', 'opacity-0');
        postsList.childNodes.forEach(li => li.classList.remove('hidden'));
        postsList.style.maxHeight = 'none';
        posts.style.maxHeight = 'none';
        currentPost = null;
    }

    commentForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentPost) return;
        const text = commentInput.value.trim();
        if (!text) return;
        await CommentsAPI.addComment(currentPost.id, text);
        commentInput.value = '';
        loadComments(currentPost.id);
    });

    closePostProfile?.addEventListener('click', hidePostProfile);

    const getPosts = async () => {
        API.listPosts().then(posts => {
            postsList.innerHTML = '';
            if (!posts) {
                postsList.innerHTML = '<li>No posts available.</li>';
                return;
            }
            posts.forEach(post => {
                const li = document.createElement('li');
                li.className = "bg-white p-4 rounded shadow cursor-pointer min-h-64 flex items-center hover:bg-blue-100 transition";
                author = post.author.canEdit ? "You" : post.author.username;
                li.innerHTML = `
                    <div class="flex items-center justify-between w-full">
                        <div class="flex-row items-center">
                            <h2 class="text-xl font-bold mb-2">${post.title}</h2>
                            <p class="text-sm text-gray-500 mb-1">By: ${author} on ${new Date(post.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>
                            <p class="mb-2">${post.content}</p>
                            <p class="text-sm text-gray-500">Category: ${post.category.charAt(0).toUpperCase() + post.category.slice(1)}</p>
                        </div>
                        ${post.image ? `<img src="/images/${post.image.String}" alt="Post Image" class="mt-2 max-w-48 h-auto rounded">` : ''}
                    </div>
                `;
                li.addEventListener('click', () => showPostProfile(post));
                postsList.appendChild(li);
            });
        }).catch(err => {
            // alert("Failed to load posts: " + err.message);
            if (err.message.includes("Authentication")) {
                API.logoutClientOnly();
                loginbtn.textContent = "Login";
                registerbtn.style.display = "block";
                newPostBtn.style.display = "none";
                postsList.innerHTML = '';
                loginPrompt.style.display = "block";
                loginbtn.onclick = () => logindialog.showModal();
            }
        });
    };

    if (API.getToken()) {
        loginPrompt.style.display = "none";
        loginbtn.textContent = "Logout";
        registerbtn.style.display = "none";
        newPostBtn.style.display = "block";
        SocketAPI.connectSocket();
        loginbtn.onclick = () => {
            if (window.socket) { window.socket.close(); window.socket = null; }
            API.logoutClientOnly();
            loginbtn.textContent = "Login";
            registerbtn.style.display = "block";
            newPostBtn.style.display = "none";
            postsList.innerHTML = '';
            loginPrompt.style.display = "block";
            loginbtn.onclick = () => logindialog.showModal();
        };
        getPosts();
    } else {
        loginPrompt.style.display = "block";
    }


    newPostBtn.addEventListener('click', function () {
        newPostDialog.showModal();
    });

    cancelPostBtn.addEventListener('click', function () {
        newPostDialog.close();
    });

    newPostForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = postImageInput.files[0];
        if (!file) {
            alert("Please select an image.");
            return;
        }
        const reader = new FileReader();
        reader.onload = async function (event) {
            try {
                await API.createPost({
                    title: postTitleInput.value.trim(),
                    content: postBodyInput.value.trim(),
                    category: postCategoryInput.value,
                    image: event.target.result
                });
                newPostDialog.close();
                alert("Post created successfully!");
                getPosts();
                newPostForm.reset();
            } catch (err) {
                alert("Failed to create post: " + err.message);
            }
        };
        reader.onerror = function () {
            alert("Failed to read image file.");
        };
        reader.readAsDataURL(file);
    });

    loginbtn.addEventListener('click', function () {
        logindialog.showModal();
    });
    const closebtn = document.getElementById('cancelbtn1');

    closebtn.addEventListener('click', function () {
        logindialog.close();
    });
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await API.login(usernameInput.value.trim(), passwordInput.value);
            SocketAPI.connectSocket();
            logindialog.close();
            alert("Logged in!");
            loginbtn.textContent = "Logout";
            newPostBtn.style.display = "block";
            registerbtn.style.display = "none";
            loginPrompt.style.display = "none";
            loginbtn.onclick = () => {
                if (window.socket) { window.socket.close(); window.socket = null; }
                API.logoutClientOnly();
                loginbtn.textContent = "Login";
                registerbtn.style.display = "block";
                newPostBtn.style.display = "none";
                postsList.innerHTML = '';
                loginPrompt.style.display = "block";
                loginbtn.onclick = () => logindialog.showModal();
            };
            getPosts();
        } catch (err) {
            alert("Login failed: " + err.message);
        }
    });

    registerbtn.addEventListener('click', function () {
        registerDialog.showModal();
    });

    regCancelBtn.addEventListener('click', function () {
        registerDialog.close();
    });

    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (regPasswordInput.value !== regConfirmPasswordInput.value) {
            alert("Passwords do not match!");
            return;
        }
        try {
            await API.register({
                username: regUsernameInput.value.trim(),
                email: regEmailInput.value.trim(),
                password: regPasswordInput.value,
                confirm_password: regConfirmPasswordInput.value
            });
            registerDialog.close();
            alert("Registered successfully!");
        } catch (err) {
            alert("Registration failed: " + err.message);
        }
    });
});