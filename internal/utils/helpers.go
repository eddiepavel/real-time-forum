package utils

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"
)

func HashPassword(password string) (string, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hashed), err
}

// CompareHashAndPassword compares a hashed password with a plain-text one
func CompareHashAndPassword(hashedPassword, plainPassword string) error {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(plainPassword))
}

func GenerateToken() (string, error) {
	bytes := make([]byte, 16) // 16 bytes = 128 bits
	_, err := rand.Read(bytes)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func DdSessionTimeSeconds(date string) int {

	layout := "2006-01-02 15:04:05"

	targetTime, err := time.Parse(layout, date)
	if err != nil {
		fmt.Println("Error parsing time:", err)
		return -1
	}

	currentTime := time.Now()

	maxAge := int(targetTime.Sub(currentTime).Seconds())

	if maxAge < 0 {
		maxAge = 0
	}

	return maxAge
}

func CompareDatesLess(date1 time.Time, date2 string) bool {
	layout := "2006-01-02 15:04:05"

	time2, err := time.Parse(layout, date2)
	if err != nil {
		fmt.Println("Error parsing time:", err)
		return false
	}

	return date1.Before(time2)
}
