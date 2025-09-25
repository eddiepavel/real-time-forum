CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    from_user TEXT NOT NULL, 
    to_user TEXT NOT NULL,
    time DATETIME NOT NULL,
    FOREIGN KEY(from_user) REFERENCES users(uuid)
    FOREIGN KEY(to_user) REFERENCES users(uuid)
);