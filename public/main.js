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
    const postsdiv = document.getElementById('posts');
    const editPostDialog = document.getElementById('editPostDialog');
    const editPostForm = editPostDialog?.querySelector('form');
    const deletePostBtn = document.getElementById('deletePostBtn');
    const editPostBtn = document.getElementById('editPostBtn');
    const newPostDialog = document.getElementById('newPostDialog');
    const newPostForm = newPostDialog?.querySelector('form');
    const deletePostDialog = document.getElementById('deletePostDialog');
    const deletePostConfirmBtn = document.getElementById('confirmDeletePostBtn');
    const deletePostCancelBtn = document.getElementById('cancelDeletePostBtn');
    const cancelPostBtn = document.getElementById('cancelPostBtn');
    const postTitleInput = document.getElementById('post_title');
    const postBodyInput = document.getElementById('post_content');
    const postCategoryInput = document.getElementById('post_category');
    const newpostTitleInput = document.getElementById('new_post_title');
    const newpostBodyInput = document.getElementById('new_post_content');
    const newpostCategoryInput = document.getElementById('new_post_category');
    const postImageInput = document.getElementById('post_image');
    const postsList = document.getElementById('postsList');
    const loginPrompt = document.getElementById('loginPrompt');
    const postProfile = document.getElementById('postProfile');
    const postProfileContainer = document.getElementById('postProfileContainer');
    const postProfileContent = document.getElementById('postProfileContent');
    const closePostProfile = document.getElementById('closePostProfile');
    const commentsSection = document.getElementById('commentSection');
    const commentsList = document.getElementById('commentsList');
    const commentForm = document.getElementById('commentForm');
    const commentInput = document.getElementById('commentInput');

    let totalPosts = 0;
    let currentPage = 0;
    let currentPosts = 0;

    function updatePostsDivHeight() {
        if (postProfile.classList.contains('translate-x-0') && postProfileContainer) {
            // Profile view is open
            requestAnimationFrame(() => {
                postsdiv.style.height = postProfileContent.offsetHeight + commentsSection.offsetHeight + "px";
            });
        } else if (postsList) {
            // List view
            postsdiv.style.height = postsList.offsetHeight + 48 + "px";
        }
    }

    function isScrolledToBottom(threshold = 15) {
        return (window.innerHeight + window.scrollY) >= (document.body.scrollHeight - threshold);
    }

    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
        if (totalPosts <= 10 || currentPosts < 10 || postProfile.classList.contains('translate-x-0') && postProfileContainer) return;

        const currentScrollY = window.scrollY;
        // Only trigger if user is scrolling down
        if (currentScrollY > lastScrollY && isScrolledToBottom()) {
            setTimeout(() => {
                getPosts(currentPage + 1);
            }, 200);
        }
        lastScrollY = currentScrollY;
    });

    let currentPost = null;

    // Modal logic
    function showDialog(dialog) {
        dialog.showModal();
        setTimeout(() => {
            dialog.classList.remove('opacity-0', 'scale-90', 'pointer-events-none');
            dialog.classList.add('opacity-100', 'scale-100');
        }, 10);
    }

    function hideDialog(dialog) {
        dialog.classList.remove('opacity-100', 'scale-100');
        dialog.classList.add('opacity-0', 'scale-90', 'pointer-events-none');
        setTimeout(() => {
            dialog.close();
        }, 300); // match transition duration
    }

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
    imageModal.onclick = function (e) {
        if (e.target === imageModal) hideImageModal();
    };

    function showPostProfile(post) {
        currentPost = post;
        loadComments(post.id);
        author = post.author.canEdit ? "You" : post.author.username;
        if (!post.author.canEdit) {
            editPostBtn.style.display = "none";
            deletePostBtn.style.display = "none";
        }
        postsList.classList.add('opacity-0');
        postsList.classList.remove('opacity-100');
        postProfileContent.innerHTML = `
            <div class="flex w-full justify-between bg-white p-8 rounded">
                <div class="flex-row">
                    <h2 class="text-xl font-bold mb-2">${post.title}</h2>
                    <p class="text-sm text-gray-500">Category: ${post.category.charAt(0).toUpperCase() + post.category.slice(1)}</p>
                    <p class="text-sm text-gray-500 mb-1">By: ${author} on ${new Date(post.created_at).toLocaleString()}</p>
                    <p class="mb-2 line-clamp-3 break-all text-ellipsis">${post.content}</p>
                </div>
                ${post.image ? `<img src="/images/${post.image.String}" alt="Post Image" class="mt-2 max-w-80 h-auto rounded cursor-pointer" id="postProfileImage">` : ''}
            </div>
        `;
        editPostBtn.onclick = () => {
            showDialog(editPostDialog);
            const cancelEditPostBtn = document.getElementById('cancelEditPostBtn');
            postTitleInput.value = post.title;
            postBodyInput.value = post.content;
            postCategoryInput.value = post.category;
            cancelEditPostBtn.onclick = () => hideDialog(editPostDialog);
            editPostForm.onsubmit = async (e) => {
                e.preventDefault();
                try {
                    await API.editPost(post.id, {
                        title: postTitleInput.value.trim(),
                        content: postBodyInput.value.trim(),
                        category: postCategoryInput.value,
                    });
                    hideDialog(editPostDialog);
                    alert("Post edited successfully!");
                    getPosts();
                    editPostForm.reset();
                    hidePostProfile();
                } catch (err) {
                    alert("Failed to edit post: " + err.message);
                }
            };
        };
        deletePostBtn.onclick = async () => {
            showDialog(deletePostDialog);
            deletePostConfirmBtn.onclick = async () => {
                try {
                    await API.deletePost(post.id);
                    hideDialog(deletePostDialog);
                    alert("Post deleted successfully!");
                    getPosts();
                    hidePostProfile();
                } catch (err) {
                    alert("Failed to delete post: " + err.message);
                }
            };
            deletePostCancelBtn.onclick = () => hideDialog(deletePostDialog);
        };
        const img = document.getElementById('postProfileImage');
        if (img) img.onclick = () => showImageModal(img.src);
        postsdiv.classList.remove('p-6');
        Array.from(postsList.children).forEach(li => li.classList.add('hidden'));
        postProfile.classList.remove('-translate-x-full', 'opacity-0');
        postProfile.classList.add('translate-x-0', 'opacity-100');
        updatePostsDivHeight();
    }

    function hidePostProfile() {
        postProfile.classList.remove('translate-x-0', 'opacity-100');
        postProfile.classList.add('-translate-x-full', 'opacity-0');
        postsdiv.classList.add('p-6');
        currentPost = null;
        setTimeout(() => {
            Array.from(postsList.children).forEach(li => li.classList.remove('hidden'));
            commentsList.innerHTML = '';
            postsList.classList.remove('opacity-0');
            postsList.classList.add('opacity-100');
            updatePostsDivHeight();
        }, 200); // match your transition duration
    }

    commentForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentPost) return;
        const text = commentInput.value.trim();
        if (!text) return;
        await API.addComment(currentPost.id, text);
        commentInput.value = '';
        loadComments(currentPost.id);
    });

    const loadComments = async (postId) => {
        console.log("Loading comments for post ID:", postId);
        API.listComments(postId).then(comments => {
            commentsList.innerHTML = '';
            if (!comments || comments.data.length === 0) {
                commentsList.innerHTML = '<li class="mb-2 text-gray-800">No comments yet.</li>';
                return;
            }
            comments.data.forEach(comment => {
                author = comment.author.canEdit ? "You" : comment.author.username;
                const li = document.createElement('li');
                li.className = "mb-2 p-2 bg-gray-100 rounded";
                li.innerHTML = `
                    <p>${comment.content}</p>
                    <p class="text-sm text-gray-600 mb-1">By: ${author} on ${new Date(comment.created_at).toLocaleString()}</p>
                `;
                commentsList.appendChild(li);
            });
            updatePostsDivHeight();
        }).catch(err => {
            alert("Failed to load comments: " + err.message);
        });
    };

    closePostProfile?.addEventListener('click', hidePostProfile);

    const getPosts = async (currentpage = 1) => {
        API.listPosts({ page: currentpage }).then(posts => {
            if (!posts) {
                postsList.innerHTML = '<li>No posts available.</li>';
                return;
            }
            totalPosts = posts.paginate.total;
            currentPosts = posts.paginate.current;
            currentPage = posts.paginate.page;
            posts.data.forEach(post => {
                const li = document.createElement('li');
                li.className = "bg-white p-4 rounded shadow cursor-pointer min-h-64 max-h-64 flex items-center hover:bg-blue-100 transition";
                author = post.author.canEdit ? "You" : post.author.username;
                li.innerHTML = `
                    <div class="flex items-center justify-between w-full">
                        <div class="flex-row items-center w-1/2 lg:w-3/4">
                            <h2 class="text-xl font-bold mb-2 text-ellipsis break-all">${post.title}</h2>
                            <p class="text-sm text-gray-500">Category: ${post.category.charAt(0).toUpperCase() + post.category.slice(1)}</p>
                            <p class="text-sm text-gray-500 mb-1">By: ${author} on ${new Date(post.created_at).toLocaleString()}</p>
                            <p class="mb-2 line-clamp-3 break-all text-ellipsis">${post.content}</p>
                        </div>
                        ${post.image ? `<img src="/images/${post.image.String}" alt="Post Image" class="mt-2 max-w-48 max-h-48 rounded">` : ''}
                    </div>
                `;
                li.addEventListener('click', () => showPostProfile(post));
                postsList.appendChild(li);
            });
            updatePostsDivHeight();
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
            updatePostsDivHeight();
        });
    };

    if (API.getToken()) {
        loginPrompt.style.display = "none";
        loginbtn.textContent = "Logout";
        registerbtn.style.display = "none";
        newPostBtn.style.display = "block";
        // SocketAPI.connectSocket();
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
        showDialog(newPostDialog);
    });

    cancelPostBtn.addEventListener('click', function () {
        hideDialog(newPostDialog);
    });

    newPostForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = postImageInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async function (event) {
                try {
                    await API.createPost({
                        title: newpostTitleInput.value.trim(),
                        content: newpostBodyInput.value.trim(),
                        category: newpostCategoryInput.value,
                        image: event.target.result
                    });
                    hideDialog(newPostDialog);
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
        } else {
            try {
                await API.createPost({
                    title: postTitleInput.value.trim(),
                    content: postBodyInput.value.trim(),
                    category: postCategoryInput.value
                });
                hideDialog(newPostDialog);
                alert("Post created successfully!");
                getPosts();
                newPostForm.reset();
            } catch (err) {
                alert("Failed to create post: " + err.message);
            }
        }
    });

    loginbtn.addEventListener('click', function () {
        showDialog(logindialog);
    });
    const closebtn = document.getElementById('cancelbtn1');

    closebtn.addEventListener('click', function () {
        hideDialog(logindialog);
    });

    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await API.login(usernameInput.value.trim(), passwordInput.value);
            // SocketAPI.connectSocket();
            hideDialog(logindialog);
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
                loginbtn.onclick = () => showDialog(logindialog);
            };
            getPosts();
        } catch (err) {
            alert("Login failed: " + err.message);
        }
    });

    registerbtn.addEventListener('click', function () {
        showDialog(registerDialog);
    });

    regCancelBtn.addEventListener('click', function () {
        hideDialog(registerDialog);
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
            hideDialog(registerDialog);
            alert("Registered successfully!");
        } catch (err) {
            alert("Registration failed: " + err.message);
        }
    });
});