document.addEventListener('DOMContentLoaded', function () {
    const loginbtn = document.getElementById('loginbtn');
    const logindialog = document.getElementById('loginDialog');

    loginbtn.addEventListener('click', function () {
        logindialog.showModal();
    });
    const closebtn = document.getElementById('cancelbtn');

    closebtn.addEventListener('click', function () {
        logindialog.close();
    });
});