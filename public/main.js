document.addEventListener('DOMContentLoaded', function () {
    const loginbtn = document.getElementById('loginbtn');
    const logindialog = document.getElementById('loginDialog');
    const loginForm = logindialog?.querySelector('form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');


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
        loginbtn.onclick = () => {
            API.logoutClientOnly();
            loginbtn.textContent = "Login";
            loginbtn.onclick = () => logindialog.showModal();
        };
        } catch (err) {
        alert("Login failed: " + err.message);
        }
    });
});