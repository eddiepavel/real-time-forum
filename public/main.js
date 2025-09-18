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
    const regCancelBtn = document.getElementById('cancelbtn');
    const newPostBtn = document.getElementById('newpostbtn');
    const newPostDialog = document.getElementById('newPostDialog');
    const newPostForm = newPostDialog?.querySelector('form');
    const cancelPostBtn = document.getElementById('cancelPostBtn');
    const postTitleInput = document.getElementById('post_title');
    const postBodyInput = document.getElementById('post_content');
    const postCategoryInput = document.getElementById('post_category');
    const postImageInput = document.getElementById('post_image');

    if (API.getToken()) {
        loginbtn.textContent = "Logout";
        registerbtn.style.display = "none";
        newPostBtn.style.display = "block";
        loginbtn.onclick = () => {
            API.logoutClientOnly();
            loginbtn.textContent = "Login";
            registerbtn.style.display = "block";
            loginbtn.onclick = () => logindialog.showModal();
        };
    }

    newPostBtn.addEventListener('click', function() {
        newPostDialog.showModal();
    });

    cancelPostBtn.addEventListener('click', function() {
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
        reader.onload = async function(event) {
            try {
                await API.createPost({
                    title: postTitleInput.value.trim(),
                    content: postBodyInput.value.trim(),
                    category: postCategoryInput.value,
                    image: event.target.result
                });
                newPostDialog.close();
                alert("Post created successfully!");
                // Optionally, refresh the post list here
            } catch (err) {
                alert("Failed to create post: " + err.message);
            }
        };
        reader.onerror = function() {
            alert("Failed to read image file.");
        };
        reader.readAsDataURL(file);
    });

    loginbtn.addEventListener('click', function () {
        logindialog.showModal();
    });
    const closebtn = document.getElementById('cancelbtn');

    closebtn.addEventListener('click', function () {
        logindialog.close();
    });
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
        await API.login(usernameInput.value.trim(), passwordInput.value);
        logindialog.close();
        alert("Logged in!");
        loginbtn.textContent = "Logout";
        newPostBtn.style.display = "block";
        registerbtn.style.display = "none";
        loginbtn.onclick = () => {
            API.logoutClientOnly();
            loginbtn.textContent = "Login";
            registerbtn.style.display = "block";
            loginbtn.onclick = () => logindialog.showModal();
        };
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