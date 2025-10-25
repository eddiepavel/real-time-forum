document.addEventListener('DOMContentLoaded', function () {
    // helpers
    const $ = (id) => document.getElementById(id);
    const clamp = (s, n = 3) => s ? (s.length > n ? s : s) : '';

    // elements
    const loginbtn = $('loginbtn');
    const logindialog = $('loginDialog');
    const loginForm = logindialog?.querySelector('form');
    const usernameInput = $('login_username');
    const passwordInput = $('login_password');

    const registerbtn = $('registerbtn');
    const registerDialog = $('registerDialog');
    const registerForm = registerDialog?.querySelector('form');
    const regUsernameInput = $('reg_username');
    const regEmailInput = $('reg_email');
    const regPasswordInput = $('reg_password');
    const regConfirmPasswordInput = $('confirm_password');
    const regCancelBtn = $('cancelbtn2');

    const currentUserDisplay = $('currentUser');
    const newPostBtn = $('newpostbtn');
    const postsdiv = $('posts');
    const editPostDialog = $('editPostDialog');
    const editPostForm = editPostDialog?.querySelector('form');
    const deletePostDialog = $('deletePostDialog');
    const deletePostConfirmBtn = $('confirmDeletePostBtn');
    const deletePostCancelBtn = $('cancelDeletePostBtn');
    const editPostBtn = $('editPostBtn');
    const deletePostBtn = $('deletePostBtn');

    const newPostDialog = $('newPostDialog');
    const newPostForm = newPostDialog?.querySelector('form');
    const cancelPostBtn = $('cancelPostBtn');

    const postTitleInput = $('post_title');
    const postBodyInput = $('post_content');
    const postCategoryInput = $('post_category');
    const newpostTitleInput = $('new_post_title');
    const newpostBodyInput = $('new_post_content');
    const newpostCategoryInput = $('new_post_category');
    const postImageInput = $('post_image');

    const postsList = $('postsList');
    const loginPrompt = $('loginPrompt');
    const postProfile = $('postProfile');
    const onlineUsersList = $('onlineUsers');
    const privateChatDrawer = $('privateChatDrawer');
    const postProfileContainer = $('postProfileContainer');
    const postProfileContent = $('postProfileContent');
    const closePostProfile = $('closePostProfile');
    const commentsSection = $('commentSection');
    const commentsList = $('commentsList');
    const commentForm = $('commentForm');
    const commentInput = $('commentInput');

    const imageModal = $('imageModal');
    const modalImage = $('modalImage');
    const closeImageModal = $('closeImageModal');

    // state
    let totalPosts = 0;
    let currentPage = 0;
    let currentPosts = 0;
    let lastScrollY = window.scrollY;
    let currentPost = null;

    // small UI utilities
    function showDialog(dialog) {
        if (!dialog) return;
        dialog.showModal();
        // transition in
        setTimeout(() => {
            dialog.classList.remove('opacity-0', 'scale-90', 'pointer-events-none');
            dialog.classList.add('opacity-100', 'scale-100');
        }, 10);
    }
    function hideDialog(dialog) {
        if (!dialog) return;
        dialog.classList.remove('opacity-100', 'scale-100');
        dialog.classList.add('opacity-0', 'scale-90', 'pointer-events-none');
        setTimeout(() => dialog.close(), 300);
    }

    function showImageModal(src) {
        if (!imageModal || !modalImage) return;
        modalImage.src = src;
        imageModal.classList.remove('opacity-0', 'pointer-events-none');
        imageModal.classList.add('opacity-100');
    }
    function hideImageModal() {
        if (!imageModal || !modalImage) return;
        imageModal.classList.add('opacity-0', 'pointer-events-none');
        imageModal.classList.remove('opacity-100');
        modalImage.src = '';
    }
    closeImageModal?.addEventListener('click', hideImageModal);
    imageModal?.addEventListener('click', (e) => { if (e.target === imageModal) hideImageModal(); });

    function updatePostsDivHeight() {
        if (!postsdiv) return;
        if (postProfile?.classList.contains('translate-x-0') && postProfileContainer) {
            requestAnimationFrame(() => {
                postsdiv.style.height = (postProfileContent?.offsetHeight || 0) + (commentsSection?.offsetHeight || 0) + "px";
            });
        } else if (postsList) {
            postsdiv.style.height = (postsList.offsetHeight || 0) + 48 + "px";
        }
    }

    function isScrolledToBottom(threshold = 15) {
        return (window.innerHeight + window.scrollY) >= (document.body.scrollHeight - threshold);
    }

    // consolidated auth UI changes
    function setAuthUI(loggedIn) {
        if (loggedIn) {
            loginPrompt && (loginPrompt.style.display = "none");
            loginbtn && (loginbtn.textContent = "Logout");
            registerbtn && (registerbtn.style.display = "none");
            newPostBtn && (newPostBtn.style.display = "block");
            privateChatDrawer && privateChatDrawer.classList.remove('hidden');
            currentUserDisplay && (currentUserDisplay.textContent = `Logged in as: ${API.getUsername()}`);
        } else {
            API.logoutClientOnly && API.logoutClientOnly();
            loginPrompt && (loginPrompt.style.display = "block");
            loginbtn && (loginbtn.textContent = "Login");
            registerbtn && (registerbtn.style.display = "block");
            newPostBtn && (newPostBtn.style.display = "none");
            postsList && (postsList.innerHTML = '');
            currentUserDisplay && (currentUserDisplay.textContent = '');
            onlineUsersList && (onlineUsersList.innerHTML = '');
            privateChatDrawer && privateChatDrawer.classList.add('hidden');
            // clicking login shows dialog
            loginbtn && (loginbtn.onclick = () => logindialog && logindialog.showModal());
        }
    }

    function handleLogoutClick() {
        if (window.socket) { window.socket.close(); window.socket = null; }
        setAuthUI(false);
    }

    // scrolling for infinite load
    window.addEventListener('scroll', () => {
        if (!postsList || totalPosts <= 10 || currentPosts < 10 || (postProfile?.classList.contains('translate-x-0') && postProfileContainer)) return;
        const currentScrollY = window.scrollY;
        if (currentScrollY > lastScrollY && isScrolledToBottom()) {
            setTimeout(() => getPosts(currentPage + 1), 200);
        }
        lastScrollY = currentScrollY;
    });

    // comments
    const loadComments = async (postId) => {
        try {
            const comments = await API.listComments(postId);
            commentsList.innerHTML = '';
            if (!comments || !comments.data || comments.data.length === 0) {
                commentsList.innerHTML = '<li class="mb-2 text-gray-800">No comments yet.</li>';
                updatePostsDivHeight();
                return;
            }
            comments.data.forEach(comment => {
                const author = comment.author.canEdit ? "You" : comment.author.username;
                const li = document.createElement('li');
                li.className = "mb-2 p-2 bg-gray-100 rounded";
                li.innerHTML = `
                    <p>${comment.content}</p>
                    <p class="text-sm text-gray-600 mb-1">By: ${author} on ${new Date(comment.created_at).toLocaleString()}</p>
                `;
                commentsList.appendChild(li);
            });
            updatePostsDivHeight();
        } catch (err) {
            alert("Failed to load comments: " + err.message);
        }
    };

    commentForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentPost) return;
        const text = commentInput.value.trim();
        if (!text) return;
        try {
            await API.addComment(currentPost.id, text);
            commentInput.value = '';
            loadComments(currentPost.id);
        } catch (err) {
            alert("Failed to add comment: " + err.message);
        }
    });

    // post element factory
    function createPostElement(post) {
        const li = document.createElement('li');
        li.className = "bg-white p-4 rounded shadow cursor-pointer min-h-64 max-h-64 flex items-center hover:bg-blue-100 transition";
        const author = post.author.canEdit ? "You" : post.author.username;
        const imgTpl = post.image ? `<img src="/images/${post.image.String}" alt="Post Image" class="mt-2 max-w-48 max-h-48 rounded">` : '';
        li.innerHTML = `
            <div class="flex items-center justify-between w-full">
                <div class="flex-row items-center w-1/2 lg:w-3/4">
                    <h2 class="text-xl font-bold mb-2 text-ellipsis break-all">${post.title}</h2>
                    <p class="text-sm text-gray-500">Category: ${post.category.charAt(0).toUpperCase() + post.category.slice(1)}</p>
                    <p class="text-sm text-gray-500 mb-1">By: ${author} on ${new Date(post.created_at).toLocaleString()}</p>
                    <p class="mb-2 line-clamp-3 break-all text-ellipsis">${post.content}</p>
                </div>
                ${imgTpl}
            </div>
        `;
        li.addEventListener('click', () => showPostProfile(post));
        return li;
    }

    // show/hide post profile
    function showPostProfile(post) {
        currentPost = post;
        loadComments(post.id);
        const author = post.author.canEdit ? "You" : post.author.username;
        if (!post.author.canEdit) {
            editPostBtn && (editPostBtn.style.display = "none");
            deletePostBtn && (deletePostBtn.style.display = "none");
        } else {
            editPostBtn && (editPostBtn.style.display = "");
            deletePostBtn && (deletePostBtn.style.display = "");
        }

        const imgHtml = post.image ? `<img src="/images/${post.image.String}" alt="Post Image" class="mt-2 max-w-80 h-auto rounded cursor-pointer" id="postProfileImage">` : '';

        postProfileContent.innerHTML = `
            <div class="flex w-full justify-between bg-white p-8 rounded">
                <div class="flex-row">
                    <h2 class="text-xl font-bold mb-2">${post.title}</h2>
                    <p class="text-sm text-gray-500">Category: ${post.category.charAt(0).toUpperCase() + post.category.slice(1)}</p>
                    <p class="text-sm text-gray-500 mb-1">By: ${author} on ${new Date(post.created_at).toLocaleString()}</p>
                    <p class="mb-2 line-clamp-3 break-all text-ellipsis">${post.content}</p>
                </div>
                ${imgHtml}
            </div>
        `;

        // edit handler
        editPostBtn && (editPostBtn.onclick = () => {
            showDialog(editPostDialog);
            const cancelEditPostBtn = $('cancelEditPostBtn');
            postTitleInput.value = post.title;
            postBodyInput.value = post.content;
            postCategoryInput.value = post.category;
            cancelEditPostBtn && (cancelEditPostBtn.onclick = () => hideDialog(editPostDialog));
            if (editPostForm) {
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
            }
        });

        // delete handler
        deletePostBtn && (deletePostBtn.onclick = () => {
            showDialog(deletePostDialog);
            deletePostConfirmBtn && (deletePostConfirmBtn.onclick = async () => {
                try {
                    await API.deletePost(post.id);
                    hideDialog(deletePostDialog);
                    alert("Post deleted successfully!");
                    getPosts();
                    hidePostProfile();
                } catch (err) {
                    alert("Failed to delete post: " + err.message);
                }
            });
            deletePostCancelBtn && (deletePostCancelBtn.onclick = () => hideDialog(deletePostDialog));
        });

        const imgEl = $('postProfileImage');
        if (imgEl) imgEl.onclick = () => showImageModal(imgEl.src);

        postsdiv && postsdiv.classList.remove('p-6');
        Array.from(postsList?.children || []).forEach(li => li.classList.add('hidden'));
        postProfile?.classList.remove('-translate-x-full', 'opacity-0');
        postProfile?.classList.add('translate-x-0', 'opacity-100');
        updatePostsDivHeight();
    }

    function hidePostProfile() {
        postProfile?.classList.remove('translate-x-0', 'opacity-100');
        postProfile?.classList.add('-translate-x-full', 'opacity-0');
        postsdiv?.classList.add('p-6');
        currentPost = null;
        setTimeout(() => {
            Array.from(postsList?.children || []).forEach(li => li.classList.remove('hidden'));
            commentsList && (commentsList.innerHTML = '');
            postsList?.classList.remove('opacity-0');
            postsList?.classList.add('opacity-100');
            updatePostsDivHeight();
        }, 200);
    }

    closePostProfile?.addEventListener('click', hidePostProfile);

    // posts listing
    const getPosts = async (page = 1) => {
        if (postsList) postsList.innerHTML = '';
        try {
            const posts = await API.listPosts({ page });
            if (!posts) {
                postsList && (postsList.innerHTML = '<li>No posts available.</li>');
                return;
            }
            totalPosts = posts.paginate.total;
            currentPosts = posts.paginate.current;
            currentPage = posts.paginate.page;
            posts.data.forEach(post => postsList && postsList.appendChild(createPostElement(post)));
            updatePostsDivHeight();
        } catch (err) {
            // handle auth error similarly to original
            if (err?.message?.includes && err.message.includes("Authentication")) {
                setAuthUI(false);
                loginbtn && (loginbtn.onclick = () => logindialog && logindialog.showModal());
            } else {
                console.error("Failed to load posts:", err);
            }
            updatePostsDivHeight();
        }
    };

    // new post handling (with optional image)
    async function submitPostPayload(payload) {
        try {
            await API.createPost(payload);
            hideDialog(newPostDialog);
            alert("Post created successfully!");
            getPosts();
            newPostForm && newPostForm.reset();
        } catch (err) {
            alert("Failed to create post: " + err.message);
        }
    }

    newPostBtn?.addEventListener('click', () => showDialog(newPostDialog));
    cancelPostBtn?.addEventListener('click', () => hideDialog(newPostDialog));

    newPostForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = postImageInput?.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (event) {
                submitPostPayload({
                    title: newpostTitleInput.value.trim(),
                    content: newpostBodyInput.value.trim(),
                    category: newpostCategoryInput.value,
                    image: event.target.result
                });
            };
            reader.onerror = () => alert("Failed to read image file.");
            reader.readAsDataURL(file);
        } else {
            submitPostPayload({
                title: postTitleInput?.value?.trim(),
                content: postBodyInput?.value?.trim(),
                category: postCategoryInput?.value
            });
        }
    });

    // login / register flows
    loginbtn?.addEventListener('click', () => showDialog(logindialog));
    $('cancelbtn1')?.addEventListener('click', () => hideDialog(logindialog));

    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await API.login(usernameInput.value.trim(), passwordInput.value);
            SocketAPI.connectSocket && SocketAPI.connectSocket();
            hideDialog(logindialog);
            alert("Logged in!");
            setAuthUI(true);
            // set logout action
            loginbtn && (loginbtn.onclick = handleLogoutClick);
            getPosts();
        } catch (err) {
            alert("Login failed: " + err.message);
        }
    });

    registerbtn?.addEventListener('click', () => showDialog(registerDialog));
    regCancelBtn?.addEventListener('click', () => hideDialog(registerDialog));

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

    // initial state
    if (API.getToken && API.getToken()) {
        setAuthUI(true);
        SocketAPI.connectSocket && SocketAPI.connectSocket();
        loginbtn && (loginbtn.onclick = handleLogoutClick);
        getPosts();
    } else {
        setAuthUI(false);
    }
});