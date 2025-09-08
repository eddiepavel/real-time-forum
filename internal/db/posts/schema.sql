CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    categories TEXT NOT NULL,
    content TEXT NOT NULL, -- Changed LONGTEXT to TEXT
    author INTEGER UNSIGNED NOT NULL, 
    time DATETIME NOT NULL,
    image_path TEXT,
    FOREIGN KEY(author) REFERENCES users(uuid)
);